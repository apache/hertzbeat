/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.database;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * load the jdbc driver first to avoid spi concurrent deadlock
 */
@Service
@Slf4j
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class JdbcSpiLoader implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        log.info("start load jdbc drivers");
        try {
            Class.forName("org.postgresql.Driver");
            Class.forName("com.microsoft.sqlserver.jdbc.SQLServerDriver");
            Class.forName("dm.jdbc.driver.DmDriver");
            Class.forName("com.clickhouse.jdbc.ClickHouseDriver");
        } catch (Exception e) {
            log.error("load jdbc error: {}", e.getMessage());
        }
        log.info("end load jdbc drivers");
    }
}
