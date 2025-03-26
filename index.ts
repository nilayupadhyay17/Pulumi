import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create the S3 bucket with website configuration
const bucket = new aws.s3.Bucket("upadhyay-site", {
    website: {
        indexDocument: "index.html",
    },
});

// Upload the index.html file to the bucket
new aws.s3.BucketObject("index", {
    bucket: bucket,
    content: "<html><h1>Hello, Nilay from Pulumi!</h1></html>",
    key: "index.html",
    contentType: "text/html",
});

// Create a public access block (so CloudFront can access the files)
new aws.s3.BucketPublicAccessBlock("bucket-public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
    ignorePublicAcls: false,
    blockPublicPolicy: false,
    restrictPublicBuckets: false,
});

// Apply a public read-only bucket policy
new aws.s3.BucketPolicy("bucket-policy", {
    bucket: bucket.id,
    policy: bucket.id.apply(bucketId => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${bucketId}/*`,
            },
        ],
    })),
});

// Create the CloudFront distribution
const cdn = new aws.cloudfront.Distribution("cdn", {
    origins: [{
        domainName: bucket.bucketRegionalDomainName,
        originId: bucket.arn,
    }],
    enabled: true,
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: bucket.arn,
        forwardedValues: { queryString: false, cookies: { forward: "none" } },
    },
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
    viewerCertificate: {
        cloudfrontDefaultCertificate: true,
    },
});

// Export the S3 bucket name and CloudFront URL
export const bucketName = bucket.bucket;
export const cloudFrontUrl = cdn.domainName;
