package com.example.bucketlister;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.example")
public class BucketListerApplication implements CommandLineRunner{

    @Value("${bucket.access.key}")
    private String accessKey;
  
    @Value("${bucket.secret.key}")
    private String secretKey;
  
    @Value("${bucket.host}")
    private String endpoint;
  
    @Value("${bucket.name}")
    private String bucketName;

  public static void main(String[] args) {
    SpringApplication.run(BucketListerApplication.class, args);
  }

  @Override
  public void run(String... args) throws Exception {
      System.out.println("Khary was here");
      System.out.println("XXXXXXXXXX: " + accessKey);
      System.out.flush();
  }

}
