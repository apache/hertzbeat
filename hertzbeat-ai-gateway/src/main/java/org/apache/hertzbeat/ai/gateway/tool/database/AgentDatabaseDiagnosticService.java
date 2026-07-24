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

package org.apache.hertzbeat.ai.gateway.tool.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/**
 * Read-only database diagnostics used by Gateway skills.
 */
@Service
public class AgentDatabaseDiagnosticService {

    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private static final int MAX_ROWS = 100;
    private static final List<String> SUPPORTED_APPS = List.of("mysql", "mariadb");

    private final MonitorService monitorService;

    public AgentDatabaseDiagnosticService(MonitorService monitorService) {
        this.monitorService = monitorService;
    }

    @Tool(name = "database.mysql_slow_queries",
            description = "Get MySQL or MariaDB slow query statistics from performance_schema.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> slowQueries(
            @ToolParam(description = "Monitor id of the MySQL or MariaDB instance.") Long monitorId,
            @ToolParam(description = "Maximum rows to return, from 1 to 50.", required = false) Integer limit) {
        int queryLimit = Math.max(1, Math.min(limit == null ? 10 : limit, 50));
        String sql = "SELECT SCHEMA_NAME AS db, DIGEST_TEXT AS query, COUNT_STAR AS exec_count, "
                + "ROUND(AVG_TIMER_WAIT/1000000000, 2) AS avg_time_ms, "
                + "ROUND(SUM_TIMER_WAIT/1000000000, 2) AS total_time_ms, "
                + "SUM_ROWS_EXAMINED AS rows_examined, SUM_ROWS_SENT AS rows_sent "
                + "FROM performance_schema.events_statements_summary_by_digest "
                + "WHERE SCHEMA_NAME IS NOT NULL ORDER BY AVG_TIMER_WAIT DESC LIMIT " + queryLimit;
        return execute(monitorId, sql, "MySQL Slow Query Statistics");
    }

    @Tool(name = "database.mysql_process_list",
            description = "Get active MySQL or MariaDB connections and their current state.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> processList(
            @ToolParam(description = "Monitor id of the MySQL or MariaDB instance.") Long monitorId) {
        return execute(monitorId,
                "SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, LEFT(INFO, 200) AS query "
                        + "FROM information_schema.PROCESSLIST WHERE COMMAND != 'Sleep' ORDER BY TIME DESC LIMIT 50",
                "MySQL Process List");
    }

    @Tool(name = "database.mysql_lock_waits",
            description = "Get MySQL or MariaDB lock waits and blocking transactions.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> lockWaits(
            @ToolParam(description = "Monitor id of the MySQL or MariaDB instance.") Long monitorId) {
        return execute(monitorId,
                "SELECT r.ENGINE_TRANSACTION_ID AS waiting_trx_id, r.THREAD_ID AS waiting_thread, "
                        + "r.OBJECT_SCHEMA AS waiting_schema, r.OBJECT_NAME AS waiting_table, "
                        + "r.LOCK_TYPE AS waiting_lock_type, r.LOCK_MODE AS waiting_lock_mode, "
                        + "b.ENGINE_TRANSACTION_ID AS blocking_trx_id, b.THREAD_ID AS blocking_thread "
                        + "FROM performance_schema.data_lock_waits w "
                        + "JOIN performance_schema.data_locks b ON b.ENGINE_LOCK_ID = w.BLOCKING_ENGINE_LOCK_ID "
                        + "JOIN performance_schema.data_locks r ON r.ENGINE_LOCK_ID = w.REQUESTING_ENGINE_LOCK_ID LIMIT 20",
                "MySQL Lock Waits");
    }

    @Tool(name = "database.mysql_global_status",
            description = "Get MySQL or MariaDB global status variables matching a LIKE pattern.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> globalStatus(
            @ToolParam(description = "Monitor id of the MySQL or MariaDB instance.") Long monitorId,
            @ToolParam(description = "Optional status variable pattern, such as Slow% or Threads%.", required = false)
            String pattern) {
        // MySQL SHOW does not accept a bind parameter here; restrict the model-provided LIKE pattern to identifier syntax.
        String safePattern = pattern == null || pattern.isBlank() ? "%" : pattern.replaceAll("[^a-zA-Z0-9_%]", "");
        return execute(monitorId, "SHOW GLOBAL STATUS LIKE '" + safePattern + "'", "MySQL Global Status");
    }

    @Tool(name = "database.explain_query",
            description = "Explain one SELECT query on a MySQL or MariaDB monitor without executing the query.")
    @AgentToolPolicy(
            exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> explainQuery(
            @ToolParam(description = "Monitor id of the MySQL or MariaDB instance.") Long monitorId,
            @ToolParam(description = "Single SELECT query to explain.") String query) {
        // Model input may contain surrounding whitespace; normalize before enforcing the read-only SQL boundary.
        String select = query == null ? "" : query.trim();
        String lowerCaseSelect = select.toLowerCase(Locale.ROOT);
        boolean startsWithSelect = lowerCaseSelect.startsWith("select") && select.length() > 6
                && Character.isWhitespace(select.charAt(6));
        if (!startsWithSelect || select.contains(";") || lowerCaseSelect.contains("--")
                || lowerCaseSelect.contains("/*") || lowerCaseSelect.contains("*/")) {
            throw new IllegalArgumentException("Only one SELECT statement without comments can be explained");
        }
        return execute(monitorId, "EXPLAIN " + select, "Query Execution Plan");
    }

    private Map<String, Object> execute(Long monitorId, String sql, String title) {
        MonitorDto monitorDto = monitorService.getMonitorDto(monitorId);
        // A skill may reference a deleted monitor; fail at this resource boundary instead of opening a connection.
        if (monitorDto == null || monitorDto.getMonitor() == null) {
            throw new IllegalArgumentException("Monitor not found: " + monitorId);
        }
        Monitor monitor = monitorDto.getMonitor();
        // Monitor app values are catalog identifiers and are case-insensitive at this comparison boundary.
        String app = monitor.getApp().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_APPS.contains(app)) {
            throw new IllegalArgumentException("Database diagnostics require a MySQL or MariaDB monitor");
        }
        List<Param> params = monitorDto.getParams();
        String host = param(params, "host");
        String username = param(params, "username");
        // Host and username are mandatory connection coordinates supplied by monitor configuration.
        if (host == null || username == null) {
            throw new IllegalArgumentException("Monitor host and username are required for database diagnostics");
        }
        String password = param(params, "password");
        if (password != null && AesUtil.isCiphertext(password)) {
            password = AesUtil.aesDecode(password);
        }
        String port = param(params, "port");
        String database = param(params, "database");
        String url = "jdbc:mysql://" + host + ":" + (port == null || port.isBlank() ? "3306" : port)
                + "/" + (database == null ? "" : database)
                + "?useUnicode=true&characterEncoding=utf-8&useSSL=false&allowPublicKeyRetrieval=true&connectTimeout=5000";
        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setMaxRows(MAX_ROWS);
            try (ResultSet resultSet = statement.executeQuery(sql)) {
                return result(title, resultSet);
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Database diagnostic query failed: " + title, exception);
        }
    }

    private Map<String, Object> result(String title, ResultSet resultSet) throws Exception {
        ResultSetMetaData metadata = resultSet.getMetaData();
        List<Map<String, Object>> rows = new ArrayList<>();
        while (resultSet.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int index = 1; index <= metadata.getColumnCount(); index++) {
                row.put(metadata.getColumnLabel(index), resultSet.getObject(index));
            }
            rows.add(row);
        }
        return Map.of("title", title, "rowCount", rows.size(), "rows", rows);
    }

    private String param(List<Param> params, String field) {
        if (params == null) {
            return null;
        }
        return params.stream()
                .filter(param -> field.equals(param.getField()))
                .map(Param::getParamValue)
                .findFirst()
                .orElse(null);
    }
}
