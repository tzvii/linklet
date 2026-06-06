#!/bin/bash
set -e  # Exit on any error

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="393847601074"
REPOSITORY_NAME="test-images"
IMAGE_TAG="${1:-latest}"  # Use argument or default to 'latest'

ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME"

echo "Building $REPOSITORY_NAME:$IMAGE_TAG..."
docker build --platform linux/amd64 -t $REPOSITORY_NAME:$IMAGE_TAG .

echo "Authenticating with ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "Tagging image..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG

echo "Pushing to ECR..."
docker push $ECR_URI:$IMAGE_TAG

echo "✓ Successfully pushed $ECR_URI:$IMAGE_TAG"