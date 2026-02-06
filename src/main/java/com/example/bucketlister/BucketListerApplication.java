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

    @Value("${bucket.host:}")
    private String endpoint;

    @Value("${bucket.name:}")
    private String bucketName;

    public static void main(String[] args) {
        logger.info("Starting BucketLister Application");
        SpringApplication.run(BucketListerApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        if (endpoint != null && !endpoint.isEmpty()) {
            logger.info("BucketLister Application initialized with endpoint: {}, bucket: {}", endpoint, bucketName);
        } else {
            logger.info("BucketLister Application initialized in DEMO MODE (no S3 bucket configured)");
        }
    }
}
