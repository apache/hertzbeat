/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.db;

import com.fasterxml.jackson.core.type.TypeReference;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.beans.PropertyDescriptor;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

/**
 * query executor for GreptimeDB SQL via JDBC
 */
@Slf4j
@Component("greptimeSqlQueryExecutor")
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSqlQueryExecutor extends SqlQueryExecutor {

    private static final String DATASOURCE = "Greptime-sql";
    private static final String DRIVER_CLASS_NAME = "org.postgresql.Driver";
    private static final String JDBC_URL_PREFIX = "jdbc:postgresql://";

    private final JdbcTemplate jdbcTemplate;
    private final HikariDataSource dataSource;

    @Autowired
    public GreptimeSqlQueryExecutor(GreptimeProperties greptimeProperties) {
        super(null, null); // No longer using RestTemplate or HttpSqlProperties

        // Initialize JDBC DataSource
        this.dataSource = new HikariDataSource();

        // Construct JDBC URL: jdbc:postgresql://endpoint/database
        String jdbcUrl = JDBC_URL_PREFIX + greptimeProperties.postgresEndpoint() + "/" + greptimeProperties.database();
        this.dataSource.setJdbcUrl(jdbcUrl);

        // Fixed driver class name for PostgreSQL protocol
        this.dataSource.setDriverClassName(DRIVER_CLASS_NAME);

        if (greptimeProperties.username() != null) {
            this.dataSource.setUsername(greptimeProperties.username());
        }
        if (greptimeProperties.password() != null) {
            this.dataSource.setPassword(greptimeProperties.password());
        }
        this.dataSource.setMaximumPoolSize(10);
        this.dataSource.setMinimumIdle(2);
        this.dataSource.setConnectionTimeout(30000);

        this.jdbcTemplate = new JdbcTemplate(this.dataSource);
        log.info("Initialized GreptimeDB JDBC connection to {}", jdbcUrl);
    }

    /**
     * Constructor for compatibility with existing tests.
     * delegating to the main constructor.
     * @param greptimeProperties greptime properties
     * @param restTemplate (unused) rest template
     */
    public GreptimeSqlQueryExecutor(GreptimeProperties greptimeProperties, RestTemplate restTemplate) {
        this(greptimeProperties);
    }

    /**
     * Constructor for testing purposes only.
     * @param jdbcTemplate Mocked JdbcTemplate
     */
    public GreptimeSqlQueryExecutor(JdbcTemplate jdbcTemplate) {
        super(null, null);
        this.dataSource = null;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<Map<String, Object>> execute(String sql) {
        log.debug("Executing GreptimeDB SQL: {}", sql);
        try {
            return jdbcTemplate.queryForList(sql);
        } catch (Exception e) {
            log.error("Failed to execute GreptimeDB SQL: {}", sql, e);
            throw e;
        }
    }

    /**
     * Execute SQL query with arguments (Prepared Statement)
     * @param sql SQL query with ? placeholders
     * @param args Arguments for placeholders
     * @return List of rows
     */
    public List<LogEntry> query(String sql, Object... args) {
        log.debug("Executing GreptimeDB SQL: {} with args: {}", sql, args);
        try {
            // Use custom RowMapper that extends BeanPropertyRowMapper
            return jdbcTemplate.query(sql, new GreptimeLogEntryRowMapper(), args);
        } catch (Exception e) {
            log.error("Failed to execute GreptimeDB SQL: {}", sql, e);
            throw e;
        }
    }

    /**
     * Execute count SQ
     * @param sql SQL
     * @return count
     */
    public Long count(String sql, Object... args) {
        try {
            return jdbcTemplate.queryForObject(sql, Long.class, args);
        } catch (Exception e) {
            log.error("Failed to execute GreptimeDB SQL: {}", sql, e);
            throw e;
        }
    }

    @Override
    public String getDatasource() {
        return DATASOURCE;
    }

    // Ensure to close the datasource when the bean is destroyed
    public void close() {
        if (this.dataSource != null && !this.dataSource.isClosed()) {
            this.dataSource.close();
        }
    }

    /**
     * Custom RowMapper that extends BeanPropertyRowMapper to leverage default mapping
     * while overriding specific fields that need type conversion (Timestamp -> Long, JSON String -> Object).
     */
    private static class GreptimeLogEntryRowMapper extends BeanPropertyRowMapper<LogEntry> {

        public GreptimeLogEntryRowMapper() {
            super(LogEntry.class);
        }

        @Override
        protected Object getColumnValue(ResultSet rs, int index, PropertyDescriptor pd) throws SQLException {
            String propertyName = pd.getName();

            // 1. Handle Timestamp to Long (nanoseconds) conversion
            if ("timeUnixNano".equals(propertyName) || "observedTimeUnixNano".equals(propertyName)) {
                Timestamp timestamp = rs.getTimestamp(index);
                if (timestamp == null) {
                    return null;
                }
                long seconds = timestamp.getTime() / 1000;
                long nanos = timestamp.getNanos();
                return seconds * 1_000_000_000L + nanos;
            }

            // 2. Handle JSON String to Map conversion (attributes, resource)
            if ("attributes".equals(propertyName) || "resource".equals(propertyName)) {
                String json = rs.getString(index);
                if (!StringUtils.hasText(json)) {
                    return null;
                }
                try {
                    return JsonUtil.fromJson(json, new TypeReference<Map<String, Object>>() {});
                } catch (Exception e) {
                    log.warn("Failed to parse JSON map for {}: {}", propertyName, json);
                    return null;
                }
            }

            // 3. Handle JSON String to InstrumentationScope conversion
            if ("instrumentationScope".equals(propertyName)) {
                String json = rs.getString(index);
                if (!StringUtils.hasText(json)) {
                    return null;
                }
                try {
                    return JsonUtil.fromJson(json, LogEntry.InstrumentationScope.class);
                } catch (Exception e) {
                    log.warn("Failed to parse instrumentationScope: {}", json);
                    return null;
                }
            }

            // 4. Default handling for other fields (traceId, spanId, severityText, body, etc.)
            return super.getColumnValue(rs, index, pd);
        }
    }
}