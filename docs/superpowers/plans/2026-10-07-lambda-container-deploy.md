# Lambda Container Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the `fennec-backend` Lambda from zip packaging to a container image, and rewire CI to build and push that image per commit.

**Architecture:** A new private ECR repo holds the image. Terraform converts the function to `package_type = "Image"` (an immutable change that forces one recreate) and references a seed image via `var.image_tag`, with `ignore_changes = [image_uri]` so CI owns runtime pushes. GitHub Actions builds `linux/amd64`, pushes a SHA-tagged image to ECR, and calls `update-function-code --image-uri`. The Lambda Web Adapter, baked into the image, replaces the LWA layer.

**Tech Stack:** Terraform (AWS provider ~> 5.60), AWS ECR + Lambda, GitHub Actions, Docker Buildx.

**Spec:** `docs/superpowers/specs/2026-10-07-lambda-container-deploy-design.md`

## Global Constraints

- Two separate git repos are touched: `server` (this repo, holds `Dockerfile` and `.github/workflows/deploy.yml`) and `terraform` at `../terraform` (holds all `*.tf`). Commit each repo's changes in that repo.
- Region is `us-east-2`. Architecture is `x86_64` / `linux/amd64` everywhere.
- Image tags are immutable, one per commit SHA. No moving `latest` tag.
- ECR retention: expire untagged after 1 day; keep last 5 tagged images.
- Do not change app code, API Gateway, the Cloudflare proxy, the runtime IAM role, Atlas, or SSM config.
- `terraform validate` is the per-task gate for `.tf` changes. `terraform plan`/`apply` run only during the manual migration (Task 8) on the machine that holds Terraform state, because they need credentials and existing state.
- Feature branch name in both repos: `feat/lambda-container-deploy`.

## Review Focus

- **Re-running a deploy for an already-built commit SHA** hits ECR's immutable `PutImage` and the workflow would fail; a re-run should skip the build and still update the function. (Task 7, build-guard step.)
- **CI build with no Buildx builder configured** fails `docker buildx build`; the workflow must set one up. (Task 7, setup-buildx step.)
- **ECR auth with a scoped resource** fails: `ecr:GetAuthorizationToken` must be on `*`, not the repo ARN, or `docker login` is denied. (Task 6, verify statement.)
- **Function recreate leaving a stale `aws_lambda_permission`**: the API Gateway invoke permission must survive or be recreated with the function, or the API returns 500 with no logs after apply. (Task 3, verify `depends_on` and name-based reference.)
- **Lifecycle pruning the `image_tag` anchor image** before a later function replacement makes `terraform apply` fail until the tag is bumped; retention of 5 plus the documented one-line fix keeps it rare. (Task 2, retention value.)

---

### Task 1: Commit the container baseline on a feature branch (server repo)

The `Dockerfile`, `docker-compose.yml`, `.dockerignore`, README section, and the spec are already on disk and validated, but uncommitted. Put them on the feature branch so the deploy work builds on a clean baseline.

**Files:**
- Modify (commit only, no content change): `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `README.md`, `docs/superpowers/specs/2026-10-07-lambda-container-deploy-design.md`, `docs/superpowers/plans/2026-10-07-lambda-container-deploy.md`

**Interfaces:**
- Produces: a `feat/lambda-container-deploy` branch in the `server` repo containing the image build context the CI workflow (Task 7) will build.

- [ ] **Step 1: Create the feature branch**

```bash
cd /Users/jdelgado/projects/roloenusa/fennec/server
git checkout -b feat/lambda-container-deploy
```

- [ ] **Step 2: Stage and commit the baseline**

```bash
git add Dockerfile docker-compose.yml .dockerignore README.md docs/superpowers/
git commit -m "chore: add container image build context and deploy spec

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Verify the tree is clean and the branch exists**

Run: `git status --short && git branch --show-current`
Expected: no output from status (clean), branch is `feat/lambda-container-deploy`.

---

### Task 2: ECR repository and lifecycle policy (terraform repo)

**Files:**
- Create: `../terraform/ecr.tf`

**Interfaces:**
- Produces: `aws_ecr_repository.backend` (attributes `.repository_url`, `.name`, `.arn`) consumed by Tasks 3, 5, and 6.

- [ ] **Step 1: Create the feature branch in the terraform repo**

```bash
cd /Users/jdelgado/projects/roloenusa/fennec/terraform
git checkout -b feat/lambda-container-deploy
```

- [ ] **Step 2: Write `ecr.tf`**

```hcl
# Private registry for the backend container image. The Lambda pulls from here;
# GitHub Actions pushes a new image per commit. Same region as the Lambda, so
# pulls incur no data-transfer cost.
resource "aws_ecr_repository" "backend" {
  name                 = "${var.app_name}-backend"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep storage near the floor: drop orphaned untagged layers fast, retain a few
# tagged images for rollback.
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep only the last 5 tagged images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 5
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

- [ ] **Step 3: Format and validate**

Run:
```bash
cd /Users/jdelgado/projects/roloenusa/fennec/terraform
terraform init -backend=false
terraform fmt
terraform validate
```
Expected: `terraform validate` prints `Success! The configuration is valid.`

- [ ] **Step 4: Commit**

```bash
git add ecr.tf
git commit -m "feat: add ECR repo and lifecycle policy for backend image

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Convert the Lambda to image packaging (terraform repo)

**Files:**
- Modify: `../terraform/lambda.tf`

**Interfaces:**
- Consumes: `aws_ecr_repository.backend.repository_url` (Task 2), `var.image_tag` (Task 4).
- Produces: `aws_lambda_function.backend` as an image function (`.arn`, `.function_name`, `.invoke_arn` unchanged in shape; still referenced by `apigateway.tf` and `github_oidc.tf`).

- [ ] **Step 1: Replace the file contents**

Replace the whole of `lambda.tf` with:

```hcl
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.app_name}-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "backend" {
  function_name = "${var.app_name}-backend"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
  architectures = ["x86_64"]
  memory_size   = var.lambda_memory_mb
  timeout       = var.lambda_timeout_s

  environment {
    variables = {
      PORT         = "8080"
      SSM_PREFIX   = var.ssm_prefix
      PROXY_SECRET = random_password.proxy_secret.result
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.lambda,
  ]

  # CI owns the running image via update-function-code; Terraform only sets the
  # create-time anchor (var.image_tag). Don't fight over the tag.
  lifecycle {
    ignore_changes = [image_uri]
  }
}
```

This removes the `data "archive_file" "lambda"` block, the `filename`/`source_code_hash` zip wiring, `runtime`, `handler`, the LWA `layers` list, and the `AWS_LAMBDA_EXEC_WRAPPER` env var. The LWA is now baked into the image at `/opt/extensions/`. The `aws_lambda_permission.apigw_invoke` in `apigateway.tf` references `function_name` (name is stable across the recreate) and `depends_on` is preserved, so API Gateway keeps working after the recreate.

- [ ] **Step 2: Format and validate**

Run:
```bash
cd /Users/jdelgado/projects/roloenusa/fennec/terraform
terraform fmt
terraform validate
```
Expected: `Success! The configuration is valid.`

Note: validate will still fail if `var.image_tag` is undeclared. That variable is added in Task 4; if validating this task in isolation fails only on an undeclared `image_tag`, proceed to Task 4 and validate there. If you implement tasks in order, add Task 4's variable before validating, or temporarily expect that one error.

- [ ] **Step 3: Commit**

```bash
git add lambda.tf
git commit -m "feat: convert backend Lambda to container image packaging

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Variables, outputs, and cleanup (terraform repo)

**Files:**
- Modify: `../terraform/variables_deploy.tf`
- Modify: `../terraform/outputs.tf`
- Delete: `../terraform/lambda_src/` (directory: `index.mjs`, `package.json`, `package-lock.json`)

**Interfaces:**
- Produces: `var.image_tag` (string), consumed by Task 3; `output.ecr_repository_url`, consumed by operators.

- [ ] **Step 1: In `variables_deploy.tf`, remove the `lwa_layer_version` block**

Delete this block entirely:

```hcl
# --- Lambda Web Adapter ---

variable "lwa_layer_version" {
  description = "Version of the public Lambda Web Adapter x86_64 layer. Check the LWA repo for the latest."
  type        = number
  default     = 28
}
```

- [ ] **Step 2: In `variables_deploy.tf`, add the `image_tag` variable**

Append:

```hcl
# --- Container image ---

variable "image_tag" {
  description = "Image tag the Lambda is created from (the seed commit SHA). CI deploys new tags out of band via update-function-code; this is only Terraform's create-time anchor."
  type        = string
}
```

- [ ] **Step 3: In `outputs.tf`, add the ECR URL output**

Append:

```hcl
output "ecr_repository_url" {
  description = "ECR repository URL for the backend image. Used by the deploy workflow."
  value       = aws_ecr_repository.backend.repository_url
}
```

- [ ] **Step 4: Delete the placeholder source directory**

```bash
cd /Users/jdelgado/projects/roloenusa/fennec/terraform
git rm -r lambda_src
```

- [ ] **Step 5: Format and validate**

Run:
```bash
terraform fmt
terraform validate
```
Expected: `Success! The configuration is valid.` (Tasks 2-4 together now form a valid config.)

- [ ] **Step 6: Commit**

```bash
git add variables_deploy.tf outputs.tf
git commit -m "feat: add image_tag var and ecr output; drop zip placeholder and LWA layer var

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Grant the CI role ECR push permissions (terraform repo)

**Files:**
- Modify: `../terraform/github_oidc.tf`

**Interfaces:**
- Consumes: `aws_ecr_repository.backend.arn` (Task 2).
- Produces: an updated `aws_iam_policy_document.ci_deploy` the CI workflow (Task 7) relies on for ECR login and push.

- [ ] **Step 1: Replace the `ci_deploy` policy document**

Replace this block:

```hcl
# CI can only update this one function's code.
data "aws_iam_policy_document" "ci_deploy" {
  statement {
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
    ]
    resources = [aws_lambda_function.backend.arn]
  }
}
```

with:

```hcl
# CI builds + pushes the image to ECR and updates this one function.
data "aws_iam_policy_document" "ci_deploy" {
  statement {
    sid = "UpdateFunction"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:GetFunction",
    ]
    resources = [aws_lambda_function.backend.arn]
  }

  # GetAuthorizationToken cannot be scoped to a repo; it must be "*".
  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:DescribeImages",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
}
```

(`ecr:DescribeImages` is included so the Task 7 re-run guard can query existing tags.)

- [ ] **Step 2: Format and validate**

Run:
```bash
terraform fmt
terraform validate
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Commit**

```bash
git add github_oidc.tf
git commit -m "feat: grant CI role ECR push and describe permissions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verify the ECR auth scope (terraform repo)

A quick guard for the Review Focus item: `GetAuthorizationToken` scoped to the repo ARN silently breaks `docker login`.

**Files:**
- Read: `../terraform/github_oidc.tf`

- [ ] **Step 1: Confirm the auth statement is unscoped**

Run:
```bash
cd /Users/jdelgado/projects/roloenusa/fennec/terraform
grep -A3 'EcrAuth' github_oidc.tf
```
Expected: the `EcrAuth` statement lists `ecr:GetAuthorizationToken` with `resources = ["*"]`. If it is scoped to the repo ARN, fix it to `["*"]` and re-commit.

---

### Task 7: Rewrite the deploy workflow (server repo)

**Files:**
- Modify: `.github/workflows/deploy.yml` (full rewrite)

**Interfaces:**
- Consumes: the `Dockerfile` (Task 1), the CI role ECR permissions (Task 5), the live ECR repo and image function (Task 8).

- [ ] **Step 1: Replace the whole workflow file**

```yaml
name: Deploy to Lambda

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  id-token: write # required for AWS OIDC
  contents: read

env:
  AWS_REGION: us-east-2
  FUNCTION_NAME: fennec-backend
  ECR_REPO: fennec-backend

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push image
        env:
          REGISTRY: ${{ steps.ecr.outputs.registry }}
        run: |
          IMAGE="$REGISTRY/$ECR_REPO:$GITHUB_SHA"
          # Tags are immutable. On a re-run for the same commit the image
          # already exists, so skip the build and reuse it.
          if aws ecr describe-images \
               --repository-name "$ECR_REPO" \
               --image-ids imageTag="$GITHUB_SHA" >/dev/null 2>&1; then
            echo "Image $IMAGE already exists; skipping build."
          else
            docker buildx build --platform linux/amd64 -t "$IMAGE" --push .
          fi
          echo "IMAGE=$IMAGE" >> "$GITHUB_ENV"

      - name: Deploy to Lambda
        run: |
          aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --image-uri "$IMAGE" \
            --publish
```

- [ ] **Step 2: Syntax-check the YAML**

Run:
```bash
cd /Users/jdelgado/projects/roloenusa/fennec/server
python3 -I -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML OK"
```
Expected: `YAML OK`. (If `actionlint` is installed, also run `actionlint .github/workflows/deploy.yml` and expect no errors.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: build and push container image to ECR in deploy workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: One-time migration (manual, human-run on the state machine)

This task is operational, not a code change. Run it from the machine that holds Terraform state, with both branches checked out. It performs the recreate (seconds of downtime, approved).

**Interfaces:**
- Consumes: everything from Tasks 2-7.
- Produces: a live image-based `fennec-backend` function.

- [ ] **Step 1: Create just the ECR repo**

```bash
cd <terraform-repo-on-state-machine>
terraform apply -target=aws_ecr_repository.backend
```

- [ ] **Step 2: Seed the first image**

```bash
cd <server-repo-on-state-machine>
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT.dkr.ecr.us-east-2.amazonaws.com"
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin "$REGISTRY"
SHA=$(git rev-parse HEAD)
docker buildx build --platform linux/amd64 -t "$REGISTRY/fennec-backend:$SHA" --push .
echo "Seed tag: $SHA"
```

- [ ] **Step 2b: Verify the image is in ECR**

Run: `aws ecr describe-images --repository-name fennec-backend --image-ids imageTag="$SHA"`
Expected: one image described, no error.

- [ ] **Step 3: Set the anchor tag**

Edit `terraform/terraform.tfvars`, add: `image_tag = "<the SHA printed above>"`

- [ ] **Step 4: Apply the full change (recreates the function)**

```bash
cd <terraform-repo-on-state-machine>
terraform plan   # review: new ECR repo + lifecycle, function REPLACED to package_type=Image, ci role gains ECR, no API Gateway/role changes
terraform apply
```

- [ ] **Step 5: Verify the function is image-based**

Run: `aws lambda get-function --function-name fennec-backend --query 'Configuration.PackageType'`
Expected: `"Image"`

- [ ] **Step 6: Verify the API end to end**

Run: `curl https://<api-gateway-url>/api/health` (the `backend_api_url` output)
Expected: HTTP 200, `{"status":"ok","db":"connected"}`

- [ ] **Step 7: Merge both branches and confirm CI**

Merge `feat/lambda-container-deploy` to `main` in both repos. Pushing `server` to `main` triggers the new workflow; confirm it builds, pushes a SHA-tagged image, and updates the function (watch `gh run watch`).
