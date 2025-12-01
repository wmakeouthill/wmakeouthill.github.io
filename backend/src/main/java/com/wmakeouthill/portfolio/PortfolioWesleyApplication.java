package com.wmakeouthill.portfolio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class PortfolioWesleyApplication {

    public static void main(String[] args) {
        SpringApplication.run(PortfolioWesleyApplication.class, args);
    }
}
