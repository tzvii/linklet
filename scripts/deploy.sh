#!/bin/bash
set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="393847601074"
REPOSITORY_NAME="linklet"
IMAGE_TAG="${1:-latest}"

ECS_CLUSTER="linklet"
ECS_SERVICE="linklet-fargate-service-1"
TASK_FAMILY="linklet-fargate"

ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME"

echo "Building $REPOSITORY_NAME:$IMAGE_TAG..."
docker build --platform linux/amd64 -t $REPOSITORY_NAME:$IMAGE_TAG .

echo "Authenticating with ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "Tagging and pushing image..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
docker push $ECR_URI:$IMAGE_TAG
echo "✓ Pushed $ECR_URI:$IMAGE_TAG"

echo "Registering new task definition revision..."
# Fetch current task def, swap in new image, register a new revision
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --query 'taskDefinition' \
  --output json)

# Replace the NEW_TASK_DEF jq line with something like:
NEW_TASK_DEF=$(echo $TASK_DEF | jq \
  --arg IMAGE "$ECR_URI:$IMAGE_TAG" \
  --argjson ENVVARS '[
    {"name": "ENV", "value": "prod"}
  ]' \
  '.containerDefinitions[0].image = $IMAGE
   | .containerDefinitions[0].environment = $ENVVARS
   | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

NEW_REVISION=$(aws ecs register-task-definition \
  --region $AWS_REGION \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)
echo "✓ Registered $NEW_REVISION"

echo "Updating ECS service..."
aws ecs update-service \
  --region $AWS_REGION \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --task-definition $NEW_REVISION \
  --force-new-deployment \
  > /dev/null
echo "✓ Service updated"

echo "Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --region $AWS_REGION \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE
echo "✓ Deployment complete: $ECR_URI:$IMAGE_TAG is live"