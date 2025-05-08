package com.example.bucketlister;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication(scanBasePackages = "com.example")
public class BucketListerApplication implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(BucketListerApplication.class);

    @Value("${bucket.access.key}")
    private String accessKey;
  
    @Value("${bucket.secret.key}")
    private String secretKey;
  
    @Value("${bucket.host}")
    private String endpoint;
  
    @Value("${bucket.name}")
    private String bucketName;

    public static void main(String[] args) {
        logger.info("Starting BucketLister Application");
        SpringApplication.run(BucketListerApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("BucketLister Application initialized with endpoint: {}, bucket: {}", endpoint, bucketName);
        // For security reasons, don't log the access key or secret key
    }
}