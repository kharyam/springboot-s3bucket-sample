package com.example.bucketbrowser;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication(scanBasePackages = "com.example")
public class BucketBrowserApplication implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(BucketBrowserApplication.class);

    @Value("${bucket.host:}")
    private String endpoint;

    @Value("${bucket.name:}")
    private String bucketName;

    public static void main(String[] args) {
        logger.info("Starting BucketBrowser Application");
        SpringApplication.run(BucketBrowserApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        if (endpoint != null && !endpoint.isEmpty()) {
            logger.info("BucketBrowser Application initialized with endpoint: {}, bucket: {}", endpoint, bucketName);
        } else {
            logger.info("BucketBrowser Application initialized in DEMO MODE (no S3 bucket configured)");
        }
    }
}
