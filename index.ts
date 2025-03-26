import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const provider = new aws.Provider("aws", {
  assumeRole: {
      roleArn: "arn:aws:iam::539247466856:role/pulumi-l8-esc-oidc-role",
      webIdentityToken: process.env.AWS_WEB_IDENTITY_TOKEN_FILE, // OIDC token path
      sessionName: "pulumi-session",
  }
});
// Create the S3 bucket with website configuration and private ACL
const bucket = new aws.s3.Bucket("my-static-site", {
  website: {
      indexDocument: "index.html",
  },
  acl: "private", // Add the private ACL
}, { provider }); // Pass the provider for custom configuration

new aws.s3.BucketObject("index", {
    bucket: bucket,
    content: "<html><h1>Hello from Pulumi!</h1></html>",
    key: "index.html",
    contentType: "text/html",
});

const cdn = new aws.cloudfront.Distribution("cdn", {
    origins: [{ domainName: bucket.bucketRegionalDomainName, originId: bucket.arn }],
    enabled: true,
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: bucket.arn,
        forwardedValues: { queryString: false, cookies: { forward: "none" } },
    },
    // Add the missing `restrictions` property
    restrictions: {
      geoRestriction: {
          restrictionType: "none",
      },
  },
  // Add the missing `viewerCertificate` property
  viewerCertificate: {
      cloudfrontDefaultCertificate: true,
  },
});

export const bucketName = bucket.bucket;
export const cloudFrontUrl = cdn.domainName;
