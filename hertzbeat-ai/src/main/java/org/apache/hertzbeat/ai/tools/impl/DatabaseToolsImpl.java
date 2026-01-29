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

package org.apache.hertzbeat.ai.tools.impl;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.tools.DatabaseTools;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Implementation of Database Tools for AI-powered database diagnostics.
 * Provides predefined safe queries - does NOT allow arbitrary SQL execution.
 */
@Slf4j
@Service
public class DatabaseToolsImpl implements DatabaseTools {

    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private static final int MAX_ROWS = 100;
    
    // Allowed database types
    private static final List<String> SUPPORTED_PLATFORMS = List.of("mysql", "mariadb");

    private final MonitorService monitorService;

    @Autowired
    public DatabaseToolsImpl(MonitorService monitorService) {
        this.monitorService = monitorService;
    }

    @Override
    @Tool(name = "get_mysql_slow_queries", description = "Get MySQL slow query statistics from performance_schema. "
            + "Returns top N slow queries sorted by average execution time. "
            + "Requires the monitor to be a MySQL type with proper credentials.")
    public String getMySqlSlowQueries(
            @ToolParam(description = "Monitor ID of the MySQL instance", required = true) Long monitorId,
            @ToolParam(description = "Maximum number of slow queries to return (default: 10, max: 50)", required = false) Integer limit) {
        
        int queryLimit = (limit == null || limit <= 0) ? 10 : Math.min(limit, 50);
        
        String sql = "SELECT SCHEMA_NAME as db, "
                + "DIGEST_TEXT as query, "
                + "COUNT_STAR as exec_count, "
                + "ROUND(AVG_TIMER_WAIT/1000000000, 2) as avg_time_ms, "
                + "ROUND(SUM_TIMER_WAIT/1000000000, 2) as total_time_ms, "
                + "SUM_ROWS_EXAMINED as rows_examined, "
                + "SUM_ROWS_SENT as rows_sent "
                + "FROM performance_schema.events_statements_summary_by_digest "
                + "WHERE SCHEMA_NAME IS NOT NULL "
                + "ORDER BY AVG_TIMER_WAIT DESC "
                + "LIMIT " + queryLimit;
        
        return executeQuery(monitorId, sql, "MySQL Slow Query Statistics");
    }

    @Override
    @Tool(name = "get_mysql_process_list", description = "Get MySQL current process list. "
            + "Shows all active connections and their current state. "
            + "Useful for identifying blocking queries or connection issues.")
    public String getMySqlProcessList(
            @ToolParam(description = "Monitor ID of the MySQL instance", required = true) Long monitorId) {
        
        String sql = "SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, "
                + "LEFT(INFO, 200) as QUERY "
                + "FROM information_schema.PROCESSLIST "
                + "WHERE COMMAND != 'Sleep' "
                + "ORDER BY TIME DESC "
                + "LIMIT 50";
        
        return executeQuery(monitorId, sql, "MySQL Process List");
    }

    @Override
    @Tool(name = "get_mysql_lock_waits", description = "Get MySQL lock wait information. "
            + "Shows current lock waits and blocking transactions. "
            + "Useful for diagnosing deadlocks and lock contention issues.")
    public String getMySqlLockWaits(
            @ToolParam(description = "Monitor ID of the MySQL instance", required = true) Long monitorId) {
        
        // Use performance_schema for MySQL 8.0+ (innodb_lock_waits was removed)
        String sql = "SELECT "
                + "r.ENGINE_TRANSACTION_ID as waiting_trx_id, "
                + "r.THREAD_ID as waiting_thread, "
                + "r.OBJECT_SCHEMA as waiting_schema, "
                + "r.OBJECT_NAME as waiting_table, "
                + "r.LOCK_TYPE as waiting_lock_type, "
                + "r.LOCK_MODE as waiting_lock_mode, "
                + "b.ENGINE_TRANSACTION_ID as blocking_trx_id, "
                + "b.THREAD_ID as blocking_thread "
                + "FROM performance_schema.data_lock_waits w "
                + "JOIN performance_schema.data_locks b ON b.ENGINE_LOCK_ID = w.BLOCKING_ENGINE_LOCK_ID "
                + "JOIN performance_schema.data_locks r ON r.ENGINE_LOCK_ID = w.REQUESTING_ENGINE_LOCK_ID "
                + "LIMIT 20";
        
        return executeQuery(monitorId, sql, "MySQL Lock Waits");
    }

    @Override
    @Tool(name = "get_mysql_global_status", description = "Get MySQL global status variables. "
            + "Returns server status matching the given pattern. "
            + "Examples: 'Slow%' for slow query stats, 'Threads%' for thread stats.")
    public String getMySqlGlobalStatus(
            @ToolParam(description = "Monitor ID of the MySQL instance", required = true) Long monitorId,
            @ToolParam(description = "Pattern to filter status variables (e.g., 'Slow%', 'Threads%')", required = false) String pattern) {
        
        String filterPattern = (pattern == null || pattern.isEmpty()) ? "%" : pattern;
        // Sanitize pattern to prevent SQL injection
        filterPattern = filterPattern.replaceAll("[^a-zA-Z0-9_%]", "");
        
        String sql = "SHOW GLOBAL STATUS LIKE '" + filterPattern + "'";
        
        return executeQuery(monitorId, sql, "MySQL Global Status");
    }

    @Override
    @Tool(name = "explain_query", description = "Explain a SELECT query for performance analysis. "
            + "ONLY SELECT queries are allowed for security reasons. "
            + "Returns the execution plan to help optimize the query.")
    public String explainQuery(
            @ToolParam(description = "Monitor ID of the MySQL instance", required = true) Long monitorId,
            @ToolParam(description = "SELECT query to explain (must start with SELECT)", required = true) String query) {
        
        if (query == null || query.trim().isEmpty()) {
            return "Error: Query cannot be empty";
        }
        
        String trimmedQuery = query.trim();
        
        // Security check: only allow SELECT statements
        if (!trimmedQuery.toUpperCase().startsWith("SELECT")) {
            return "Error: Only SELECT queries are allowed for EXPLAIN. "
                    + "The query must start with 'SELECT'.";
        }
        
        // Additional security checks
        String lowerQuery = trimmedQuery.toLowerCase();
        if (lowerQuery.contains(";") || lowerQuery.contains("--") 
                || lowerQuery.contains("/*") || lowerQuery.contains("*/")) {
            return "Error: Query contains invalid characters. "
                    + "Semicolons and comments are not allowed.";
        }
        
        String sql = "EXPLAIN " + trimmedQuery;
        
        return executeQuery(monitorId, sql, "Query Execution Plan");
    }

    /**
     * Execute a predefined safe query against the database.
     */
    private String executeQuery(Long monitorId, String sql, String title) {
        log.info("Executing database query for monitor {}: {}", monitorId, title);
        
        try {
            // Get monitor DTO which includes both monitor and params
            MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
            if (monitorDto == null || monitorDto.getMonitor() == null) {
                return "Error: Monitor not found with ID: " + monitorId;
            }
            
            Monitor monitor = monitorDto.getMonitor();
            
            if (!SUPPORTED_PLATFORMS.contains(monitor.getApp().toLowerCase())) {
                return "Error: This tool only supports MySQL/MariaDB. "
                        + "Current monitor type: " + monitor.getApp();
            }
            
            // Get connection parameters from MonitorDto
            List<Param> params = monitorDto.getParams();
            if (params == null || params.isEmpty()) {
                return "Error: Monitor has no connection parameters configured.";
            }
            
            String host = getParamValue(params, "host");
            String port = getParamValue(params, "port");
            String database = getParamValue(params, "database");
            String username = getParamValue(params, "username");
            String password = getParamValue(params, "password");
            
            // Decrypt password if it's encrypted
            if (password != null && AesUtil.isCiphertext(password)) {
                password = AesUtil.aesDecode(password);
            }
            
            if (host == null || username == null) {
                return "Error: Monitor connection parameters incomplete. "
                        + "Ensure host and username are configured.";
            }
            
            // Build connection URL
            String url = buildJdbcUrl(monitor.getApp(), host, port, database);
            
            // Execute query
            return executeAndFormat(url, username, password, sql, title);
            
        } catch (Exception e) {
            log.error("Error executing database query: {}", e.getMessage(), e);
            return "Error executing query: " + e.getMessage();
        }
    }
    
    private String getParamValue(List<Param> params, String field) {
        return params.stream()
                .filter(p -> field.equals(p.getField()))
                .map(Param::getParamValue)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }
    
    private String buildJdbcUrl(String platform, String host, String port, String database) {
        String effectivePort = (port == null || port.isEmpty()) ? "3306" : port;
        String effectiveDb = (database == null || database.isEmpty()) ? "" : database;
        
        return "jdbc:mysql://" + host + ":" + effectivePort + "/" + effectiveDb
                + "?useUnicode=true&characterEncoding=utf-8&useSSL=false"
                + "&allowPublicKeyRetrieval=true&connectTimeout=5000";
    }
    
    private String executeAndFormat(String url, String username, String password, 
            String sql, String title) throws Exception {
        
        StringBuilder result = new StringBuilder();
        result.append("=== ").append(title).append(" ===\n\n");
        
        try (Connection conn = DriverManager.getConnection(url, username, password);
             Statement stmt = conn.createStatement()) {
            
            stmt.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            stmt.setMaxRows(MAX_ROWS);
            
            try (ResultSet rs = stmt.executeQuery(sql)) {
                ResultSetMetaData meta = rs.getMetaData();
                int columnCount = meta.getColumnCount();
                
                // Build header
                StringBuilder header = new StringBuilder();
                StringBuilder separator = new StringBuilder();
                for (int i = 1; i <= columnCount; i++) {
                    String columnName = meta.getColumnLabel(i);
                    header.append(String.format("%-20s", columnName));
                    separator.append("-".repeat(20));
                }
                result.append(header).append("\n");
                result.append(separator).append("\n");
                
                // Build rows
                int rowCount = 0;
                while (rs.next()) {
                    StringBuilder row = new StringBuilder();
                    for (int i = 1; i <= columnCount; i++) {
                        String value = rs.getString(i);
                        if (value == null) {
                            value = "NULL";
                        } else if (value.length() > 50) {
                            value = value.substring(0, 47) + "...";
                        }
                        row.append(String.format("%-20s", value));
                    }
                    result.append(row).append("\n");
                    rowCount++;
                }
                
                result.append("\n").append("Total: ").append(rowCount).append(" rows");
            }
        }
        
        return result.toString();
    }
}
