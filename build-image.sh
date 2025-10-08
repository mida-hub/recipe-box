#!/bin/bash
set -euo pipefail

# --- Configuration ---
# Get the Project ID from gcloud config
PROJECT_ID=$(gcloud config get-value project)
REGION="asia-northeast1"
REPOSITORY="recipe-box-repo"
IMAGE_NAME="recipe-box-backend"

# Use the short git commit hash as the image tag for versioning
GIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG=${GIT_HASH}

# --- Build and Push ---
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"

echo "Building and pushing image: ${IMAGE_PATH}:${IMAGE_TAG}"
echo "Using latest tag: ${IMAGE_PATH}:latest"

# Submit the build to Google Cloud Build
# This command builds the Docker image using Dockerfile-backend and pushes it to Artifact Registry
# with two tags: the git hash and 'latest'.
gcloud builds submit . --config=cloudbuild.yaml \
    --gcs-source-staging-dir=gs://cloudbuild-source-recipe-box-474414/source \
    --substitutions=_IMAGE_PATH="${IMAGE_PATH}",_TAG="${IMAGE_TAG}"

echo "----------------------------------------"

echo "
Next steps:

Option 1: Deploy directly with gcloud (imperative)

gcloud run services update ${IMAGE_NAME} \
    --region=${REGION} \
    --image=${IMAGE_PATH}:${IMAGE_TAG} \
    --project=${PROJECT_ID} \
    --quiet

Option 2: Deploy with Terraform (declarative - recommended)

cd terraform && terraform apply -var=\"image_tag=${IMAGE_TAG}\"

"echo "Build complete."
echo "Image: ${IMAGE_PATH}:${IMAGE_TAG}"
echo "       ${IMAGE_PATH}:latest"
echo "----------------------------------------"
