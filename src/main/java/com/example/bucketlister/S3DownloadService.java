package com.example.bucketlister;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
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
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.S3Object;

@Service
public class S3DownloadService {

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
        String region = "us-east-1"; // Not applicalbe for ocp, default it.
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
        InputStream s3ObjectInputStream = s3Client.getObject(getObjectRequest);

        // Read the InputStream into a byte array
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int length;
        while ((length = s3ObjectInputStream.read(buffer)) > -1) {
            byteArrayOutputStream.write(buffer, 0, length);
        }
        return byteArrayOutputStream.toByteArray();
    }
}