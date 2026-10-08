/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.boot.registry.BootstrapServiceRegistryBuilder;
import org.hibernate.boot.registry.selector.spi.StrategySelector;
import org.hibernate.dialect.Dialect;
import org.hibernate.dialect.MySQLDialect;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.jdbc.DatabaseDriver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

/** Quotes native MySQL keywords without changing H2's case-sensitive quoted identifiers. */
@Configuration(proxyBeanMethods = false)
public class MySqlJpaConfiguration {

    @Bean
    public HibernatePropertiesCustomizer mysqlKeywordQuoting(Environment environment) {
        return properties -> {
            Object configured = properties.get(AvailableSettings.DIALECT);
            boolean mysql;
            if (configured == null) {
                mysql = DatabaseDriver.fromJdbcUrl(environment.getProperty("spring.datasource.url")) == DatabaseDriver.MYSQL;
            } else {
                if (configured instanceof Class<?> type) {
                    mysql = MySQLDialect.class.isAssignableFrom(type);
                } else if (configured instanceof Dialect) {
                    mysql = configured instanceof MySQLDialect;
                } else {
                    try (var registry = new BootstrapServiceRegistryBuilder().build()) {
                        Class<? extends Dialect> dialect = registry.requireService(StrategySelector.class)
                                .selectStrategyImplementor(Dialect.class, configured.toString());
                        mysql = MySQLDialect.class.isAssignableFrom(dialect);
                    }
                }
            }
            if (mysql) {
                properties.putIfAbsent(AvailableSettings.KEYWORD_AUTO_QUOTING_ENABLED, true);
            }
        };
    }
}
