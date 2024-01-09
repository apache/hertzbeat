package org.dromara.hertzbeat.collector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import javax.annotation.PostConstruct;

/**
 * collector startup
 * @author tom
 */
@SpringBootApplication
public class Collector {
    public static void main(String[] args) {
        SpringApplication.run(Collector.class, args);
    }

    @PostConstruct
    public void init() {
        System.setProperty("jdk.jndi.object.factoriesFilter", "!com.zaxxer.hikari.HikariJNDIFactory");
    }
}
