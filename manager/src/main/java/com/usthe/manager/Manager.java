package com.usthe.manager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

/**
 * @author tomsun28
 * @date 2021/11/11 16:45
 */

@SpringBootApplication
@EnableFeignClients(basePackages = {"com.usthe"})
public class Manager {

    public static void main(String[] args) {
        SpringApplication.run(Manager.class, args);
    }
}
