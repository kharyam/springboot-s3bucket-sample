package com.example.bucketlister;

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

@Service
public class S3Service {

    @Value("${bucket.access.key}")
    private String accessKey;
  
    @Value("${bucket.secret.key}")
    private String secretKey;
  
    @Value("${bucket.host}")
    private String endpoint;
  
    @Value("${bucket.name}")
    private String bucketName;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        var creds = AwsBasicCredentials.create(accessKey, secretKey);
        String region = "us-east-1"; // Not applicable for ocp, default it.
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(creds))
                .forcePathStyle(true) // Required for OpenShift ODF
                .build();
    }

    public List<String> listBucketContents() {
        ArrayList<String> result = new ArrayList<String>();

        try {
            var request = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .build();

            var response = s3Client.listObjectsV2(request);
            
            for (S3Object object : response.contents()) {
                result.add(object.key());
            }

        } catch (Exception e) {
            System.err.println("Failed to list objects: " + e.getMessage());
            e.printStackTrace();
        }

        return result;
    }

    public byte[] downloadFile(String key) throws Exception {
        // Build the GetObjectRequest to fetch the file
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        // Get the object from the S3 bucket as InputStream
        ResponseInputStream<GetObjectResponse> s3ObjectInputStream = s3Client.getObject(getObjectRequest);

        // Read the InputStream into a byte array
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int length;
        while ((length = s3ObjectInputStream.read(buffer)) > -1) {
            byteArrayOutputStream.write(buffer, 0, length);
        }
        return byteArrayOutputStream.toByteArray();
    }

    public void uploadFile(String key, byte[] fileContent, String contentType) {
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

        } catch (Exception e) {
            System.err.println("Failed to upload file: " + e.getMessage());
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    public void deleteFile(String key) {
        try {
            // Create delete request
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            // Delete from S3
            s3Client.deleteObject(deleteObjectRequest);

        } catch (Exception e) {
            System.err.println("Failed to delete file: " + e.getMessage());
            throw new RuntimeException("Failed to delete file", e);
        }
    }
}
