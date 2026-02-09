package com.example.bucketbrowser;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Redirect root URL to our index.html
        registry.addViewController("/").setViewName("forward:/index.html");
        // Serve the custom login page
        registry.addViewController("/login").setViewName("forward:/login.html");
    }
}
