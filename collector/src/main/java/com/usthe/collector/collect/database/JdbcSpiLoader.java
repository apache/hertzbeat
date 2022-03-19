package com.usthe.collector.collect.database;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * 预加载jdbc驱动包 避免spi并发加载造成死锁
 * @author tom
 * @date 2022/3/19 15:39
 */
@Service
@Slf4j
@Order(value = 0)
public class JdbcSpiLoader implements CommandLineRunner {


    @Override
    public void run(String... args) throws Exception {
        log.info("start load jdbc drivers");
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            Class.forName("org.postgresql.Driver");
            Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
        } catch (Exception e) {
            log.error("load jdbc error: {}", e.getMessage(), e);
        }
        log.info("end load jdbc drivers");
    }
}
