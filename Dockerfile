# syntax=docker/dockerfile:1

# The deployment contract: this image runs the Express app as an HTTP server on
# PORT (8080), with the Lambda Web Adapter present as an extension. Any future
# image (another language) that honors the same contract is a drop-in swap, so
# the Lambda infra never changes. See README "Container image".

# Build target is the Lambda runtime architecture (x86_64), pinned so the image
# is identical regardless of the build host. On arm64 hosts (Apple Silicon) this
# builds under emulation: correct result, slower build.
FROM --platform=linux/amd64 node:22-bookworm-slim AS deps
WORKDIR /app

# Manifest and lockfile first so dependency layers cache across code-only changes.
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

FROM --platform=linux/amd64 node:22-bookworm-slim AS runtime
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
