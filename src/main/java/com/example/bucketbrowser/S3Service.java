package com.example.bucketbrowser;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class S3Service {
    private static final Logger logger = LoggerFactory.getLogger(S3Service.class);

    @Value("${bucket.access.key:}")
    private String accessKey;

    @Value("${bucket.secret.key:}")
    private String secretKey;

    @Value("${bucket.host:}")
    private String endpoint;

    @Value("${bucket.name:}")
    private String bucketName;

    private S3Client s3Client;
    private boolean initialized = false;

    @PostConstruct
    public void init() {
        if (endpoint == null || endpoint.isEmpty()) {
            logger.info("S3 endpoint not configured — skipping S3 client initialization (demo mode)");
            return;
        }

        logger.info("Initializing S3 client with endpoint: {}", endpoint);

        var creds = AwsBasicCredentials.create(accessKey, secretKey);
        String region = "us-east-1"; // Not applicable for ocp, default it.
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .forcePathStyle(true) // Required for OpenShift ODF
                .build();

        initialized = true;
        logger.info("S3 client initialized successfully");
    }

    public boolean isInitialized() {
        return initialized;
    }

    private void requireInitialized() {
        if (!initialized) {
            throw new IllegalStateException("S3 client is not initialized — bucket configuration is missing");
        }
    }

    public List<String> listBucketContents() {
        requireInitialized();
        logger.debug("Listing contents of bucket: {}", bucketName);
        ArrayList<String> result = new ArrayList<String>();

        try {
            var request = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .build();

            var response = s3Client.listObjectsV2(request);

            for (S3Object object : response.contents()) {
                result.add(object.key());
            }

            logger.debug("Found {} objects in bucket", result.size());
        } catch (Exception e) {
            logger.error("Failed to list objects: {}", e.getMessage(), e);
        }

        return result;
    }

    public byte[] downloadFile(String key) throws Exception {
        requireInitialized();
        logger.debug("Downloading file with key: {}", key);

        // Build the GetObjectRequest to fetch the file
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        try {
            // Get the object from the S3 bucket as InputStream
            ResponseInputStream<GetObjectResponse> s3ObjectInputStream = s3Client.getObject(getObjectRequest);

            // Read the InputStream into a byte array
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            while ((length = s3ObjectInputStream.read(buffer)) > -1) {
                byteArrayOutputStream.write(buffer, 0, length);
            }

            byte[] result = byteArrayOutputStream.toByteArray();
            logger.debug("Successfully downloaded file with key: {}, size: {} bytes", key, result.length);

            return result;
        } catch (Exception e) {
            logger.error("Failed to download file with key {}: {}", key, e.getMessage(), e);
            throw e;
        }
    }

    public void uploadFile(String key, byte[] fileContent, String contentType) {
        requireInitialized();
        logger.debug("Uploading file with key: {}, size: {} bytes, content-type: {}",
                key, fileContent.length, contentType);

        try {
            // Create request
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            // Upload to S3
            s3Client.putObject(putObjectRequest,
                    RequestBody.fromInputStream(new ByteArrayInputStream(fileContent), fileContent.length));

            logger.debug("Successfully uploaded file with key: {}", key);
        } catch (Exception e) {
            logger.error("Failed to upload file with key {}: {}", key, e.getMessage(), e);
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    public void deleteFile(String key) {
        requireInitialized();
        logger.debug("Deleting file with key: {}", key);

        try {
            // Create delete request
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            // Delete from S3
            s3Client.deleteObject(deleteObjectRequest);

            logger.debug("Successfully deleted file with key: {}", key);
        } catch (Exception e) {
            logger.error("Failed to delete file with key {}: {}", key, e.getMessage(), e);
            throw new RuntimeException("Failed to delete file", e);
        }
    }
}
