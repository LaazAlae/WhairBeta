/**
 * AWS SDK configuration for the Whair platform.
 * Used primarily for AWS Rekognition face comparison services.
 */

/**
 * The AWS region where Rekognition resources are provisioned.
 * Defaults to us-east-1 if not specified in environment.
 */
export const AWS_REGION = process.env.AWS_REGION ?? "us-east-1"

/**
 * Checks whether AWS credentials are configured in the environment.
 * Both the access key ID and secret access key must be present.
 *
 * @returns true if both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set
 */
export function isAWSConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  )
}
