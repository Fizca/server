# syntax=docker/dockerfile:1

# The deployment contract: this image runs the Express app as an HTTP server on
# PORT (8080), with the Lambda Web Adapter present as an extension. Any future
# image (another language) that honors the same contract is a drop-in swap, so
# the Lambda infra never changes. See README "Container image".

# Target platform (linux/amd64, matching the x86_64 Lambda runtime) is set by the
# build command: --platform in the CI and seed builds, and `platform:` in
# docker-compose.yml. It is deliberately NOT pinned in FROM: BuildKit lints
# against a constant --platform there, and it would break multi-arch builds. On
# arm64 hosts the amd64 build runs under emulation (correct, slower).
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Manifest and lockfile first so dependency layers cache across code-only changes.
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

# Lambda Web Adapter (x86_64). Dormant outside Lambda; inside Lambda it proxies
# each invocation to the Express server on PORT. Baked into the image so the
# container is self-contained and the contract survives a language swap.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8080
CMD ["./run.sh"]
