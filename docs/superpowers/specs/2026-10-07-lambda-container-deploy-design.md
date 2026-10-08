# Lambda container-image deployment

Date: 2026-10-07
Status: Draft for review

## Goal

Move the `fennec-backend` Lambda from zip packaging to a container image, using
the Docker image already defined in the `server` repo. The image keeps the
Lambda Web Adapter contract (HTTP server on port 8080), so a future language
rewrite is a drop-in image swap with no infra change.

This spec covers the one-time migration and the ongoing deploy pipeline. It does
not change app behavior, the API Gateway front door, or any runtime config.

## Current state

- `fennec-backend` is live as a **zip** function. Confirmed by two successful
  `deploy.yml` runs (latest 2026-10-07); `update-function-code --zip-file` only
  succeeds against an existing function.
- The Lambda Web Adapter is attached as a **layer** (`LambdaAdapterLayerX86`
  v28), with `AWS_LAMBDA_EXEC_WRAPPER = /opt/bootstrap`.
- Terraform state lives on another machine. The code in these repos is the
  source of truth and the apply will run against that existing state. No
  `terraform import` is required.
- API Gateway (HTTP API, AWS_PROXY, payload 2.0) fronts the Lambda. Function
  URLs are blocked account-wide. This stays unchanged.
- The CI role (`fennec-ci-deploy`) can only `lambda:UpdateFunctionCode` and
  `lambda:GetFunction`. It has no ECR permissions.

## Locked decisions

- **Tags:** immutable, one image per commit SHA. No moving `latest`.
- **Retention:** keep the last 5 tagged images; expire untagged images after
  1 day. Adjustable; chosen for rollback headroom over marginal storage savings.
- **First image:** one-time manual build + push to seed ECR, then apply. CI owns
  every push after.
- **Downtime:** `package_type` is immutable, so the switch forces a Terraform
  destroy/recreate of the function. Seconds of downtime is acceptable.
- **Architecture:** `linux/amd64` (x86_64), matching the current runtime and the
  image build.

## Design

### 1. New file: `terraform/ecr.tf`

A private ECR repository plus a lifecycle policy.

- `aws_ecr_repository.backend`
  - `name = "${var.app_name}-backend"`
  - `image_tag_mutability = "IMMUTABLE"`
  - `force_delete = true` (so `terraform destroy` removes stored images)
  - `image_scanning_configuration { scan_on_push = true }` (basic scanning, free)
- `aws_ecr_lifecycle_policy.backend` with two rules:
  - Rule 1: expire untagged images older than 1 day (`sinceImagePushed`).
  - Rule 2: keep the last 5 tagged images (`imageCountMoreThan = 5`).

### 2. `terraform/lambda.tf`

Convert the function to image packaging.

Remove:
- `data "archive_file" "lambda"` block.
- `filename`, `source_code_hash`, `runtime`, `handler`.
- The `layers` list (the LWA layer).
- The `AWS_LAMBDA_EXEC_WRAPPER = "/opt/bootstrap"` env entry (the adapter is now
  baked into the image at `/opt/extensions/`).

Add:
- `package_type = "Image"`
- `image_uri = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"`
- `architectures = ["x86_64"]`

Change:
- `lifecycle { ignore_changes = [image_uri] }` so CI's per-commit image updates
  do not conflict with Terraform.

Keep: `memory_size`, `timeout`, `role`, the remaining `environment` variables
(`PORT`, `SSM_PREFIX`, `PROXY_SECRET`), the CloudWatch log group, `depends_on`.

### 3. Cleanups

- Delete the `terraform/lambda_src/` directory (placeholder for the zip create
  trick, now unused).
- Remove the `lwa_layer_version` variable from `terraform/variables_deploy.tf`.
- Add an `image_tag` variable (string) to `terraform/variables_deploy.tf`. This
  is the create-time anchor; set to the seed commit SHA in tfvars.

### 4. `terraform/outputs.tf`

Add:
```
output "ecr_repository_url" {
  description = "ECR repository URL for the backend image. Used by the deploy workflow."
  value       = aws_ecr_repository.backend.repository_url
}
```

### 5. `terraform/github_oidc.tf`

Add ECR permissions to the `ci_deploy` policy document, keeping the existing
`lambda:UpdateFunctionCode` / `lambda:GetFunction` statement.

- Statement `EcrAuth`: `ecr:GetAuthorizationToken` on `*` (cannot be scoped).
- Statement `EcrPush` on `aws_ecr_repository.backend.arn`:
  `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`,
  `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`, `ecr:PutImage`,
  `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer`.

### 6. `server/.github/workflows/deploy.yml`

Rewrite the build and deploy steps. Drop Node/yarn/zip entirely.

Flow:
1. `actions/checkout`.
2. Configure AWS credentials via OIDC (existing `AWS_DEPLOY_ROLE`), moved before
   the build so ECR login works.
3. Resolve registry: `<account-id>.dkr.ecr.us-east-2.amazonaws.com` via
   `aws sts get-caller-identity`.
4. `aws ecr get-login-password | docker login`.
5. `docker buildx build --platform linux/amd64 -t $REGISTRY/fennec-backend:$GITHUB_SHA --push .`
   (CI runners are amd64, so no emulation.)
6. `aws lambda update-function-code --function-name fennec-backend
   --image-uri $REGISTRY/fennec-backend:$GITHUB_SHA --publish`.

Keep `permissions: id-token: write, contents: read`, the `us-east-2` region, and
the `main` + `workflow_dispatch` triggers.

## One-time migration runbook

Run from the machine that holds Terraform state, with this code checked out.

1. `cd terraform`
2. `terraform apply -target=aws_ecr_repository.backend` (create just the repo).
3. From `server/`, authenticate and seed the first image:
   - `aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-2.amazonaws.com`
   - `docker buildx build --platform linux/amd64 -t <account-id>.dkr.ecr.us-east-2.amazonaws.com/fennec-backend:$(git rev-parse HEAD) --push .`
4. Set `image_tag` to that commit SHA in `terraform/terraform.tfvars`.
5. `cd terraform && terraform apply` (recreates the function as an image
   function; brief downtime).
6. Verify: `curl https://<api-gateway-url>/api/health` returns
   `{"status":"ok","db":"connected"}`.
7. Commit and push. CI owns every deploy from here.

## Rollback

- Bad image: `aws lambda update-function-code --function-name fennec-backend
  --image-uri <registry>/fennec-backend:<previous-sha> --publish`.
- Reject the image model entirely: `git revert` the `lambda.tf` change and
  re-apply to return to zip packaging.

## Cost

New cost is ECR storage only, at $0.10/GB-month. Layer dedup means the base and
`node_modules` layers (~150 MB compressed) are stored once; normal code deploys
add only the ~300 kB app layer. Expected: a few cents per month. Lambda pricing,
image pulls (same region), basic scanning, API Gateway, CloudWatch, SSM, S3, and
Atlas are all unchanged.

## Known caveat

The `image_tag` anchor in Terraform points at the seed image. If the lifecycle
policy prunes that exact image and a later apply triggers a function
replacement, the plan fails until `image_tag` is bumped to a current SHA. It only
bites on a replacement, and the fix is one line. Accepted over adding a
protected never-pruned tag.

## Out of scope

- App code changes.
- API Gateway, Cloudflare proxy, runtime IAM role, Atlas, SSM config.
- Moving Terraform state to a remote backend (separate concern).

## Verification

- `terraform plan` shows: new ECR repo + lifecycle, function replacement to
  `package_type = Image`, CI role gains ECR statements, no changes to API
  Gateway or runtime role.
- Post-apply: `aws lambda get-function` reports `PackageType: Image`.
- `GET /api/health` through the API Gateway URL returns 200 `db: connected`.
- A test push to `main` builds, pushes a SHA-tagged image, and updates the
  function.
