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

package org.apache.hertzbeat.collector.collect.cloudspanner;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * Force-loads the Cloud Spanner JDBC driver at startup to prevent SPI
 * concurrent deadlock when multiple threads first access the driver
 * simultaneously.  Mirrors the pattern in JdbcSpiLoader for the drivers
 * bundled in hertzbeat-collector-basic.
 */
@Service
@Slf4j
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class CloudSpannerDriverLoader implements CommandLineRunner {

    @Override
    public void run(String... args) {
        log.info("loading Cloud Spanner JDBC driver");
        try {
            Class.forName("com.google.cloud.spanner.jdbc.JdbcDriver");
        } catch (Exception e) {
            log.error("failed to load Cloud Spanner JDBC driver: {}", e.getMessage());
        }
    }
}
