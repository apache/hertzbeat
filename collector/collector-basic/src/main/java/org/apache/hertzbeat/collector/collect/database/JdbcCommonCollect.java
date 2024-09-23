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

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.apache.hertzbeat.collector.collect.common.cache.JdbcConnect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.postgresql.util.PSQLException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.util.StringUtils;

/**
 * common query for database query
 */
@Slf4j
public class JdbcCommonCollect extends AbstractCollect {

    private static final String QUERY_TYPE_ONE_ROW = "oneRow";
    private static final String QUERY_TYPE_MULTI_ROW = "multiRow";
    private static final String QUERY_TYPE_COLUMNS = "columns";
    private static final String RUN_SCRIPT = "runScript";
    
    private static final String[] VULNERABLE_KEYWORDS = {"allowLoadLocalInfile", "allowLoadLocalInfileInPath", "useLocalInfile"};

    private final ConnectionCommonCache<CacheIdentifier, JdbcConnect> connectionCommonCache;

    public JdbcCommonCollect(){
        connectionCommonCache = new ConnectionCommonCache<>();
    }

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getJdbc() == null) {
            throw new IllegalArgumentException("Database collect must has jdbc params");
        }
        if (StringUtils.hasText(metrics.getJdbc().getUrl())) {
            for (String keyword : VULNERABLE_KEYWORDS) {
                if (metrics.getJdbc().getUrl().contains(keyword)) {
                    throw new IllegalArgumentException("Jdbc url prohibit contains vulnerable param " + keyword);
                }
            }
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        JdbcProtocol jdbcProtocol = metrics.getJdbc();
        String databaseUrl = constructDatabaseUrl(jdbcProtocol);
        int timeout = CollectUtil.getTimeout(jdbcProtocol.getTimeout());
        Statement statement = null;
        try {
            statement = getConnection(jdbcProtocol.getUsername(),
                    jdbcProtocol.getPassword(), databaseUrl, timeout);
            switch (jdbcProtocol.getQueryType()) {
                case QUERY_TYPE_ONE_ROW -> queryOneRow(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                case QUERY_TYPE_MULTI_ROW -> queryMultiRow(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                case QUERY_TYPE_COLUMNS -> queryOneRowByMatchTwoColumns(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                case RUN_SCRIPT -> {
                    Connection connection = statement.getConnection();
                    FileSystemResource rc = new FileSystemResource(jdbcProtocol.getSql());
                    ScriptUtils.executeSqlScript(connection, rc);
                }
                default -> {
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Not support database query type: " + jdbcProtocol.getQueryType());
                }
            }
        } catch (PSQLException psqlException) {
            // for PostgreSQL 08001
            if (CollectorConstants.POSTGRESQL_UN_REACHABLE_CODE.equals(psqlException.getSQLState())) {
                // Peer connection failed, unreachable
                builder.setCode(CollectRep.Code.UN_REACHABLE);
            } else {
                builder.setCode(CollectRep.Code.FAIL);
            }
            builder.setMsg("Error: " + psqlException.getMessage() + " Code: " + psqlException.getSQLState());
        } catch (SQLException sqlException) {
            log.warn("Jdbc sql error: {}, code: {}.", sqlException.getMessage(), sqlException.getErrorCode());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Query Error: " + sqlException.getMessage() + " Code: " + sqlException.getErrorCode());
        } catch (Exception e) {
            String errorMessage = CommonUtil.getMessageFromThrowable(e);
            log.error("Jdbc error: {}.", errorMessage, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Query Error: " + errorMessage);
        } finally {
            if (statement != null) {
                try {
                    statement.close();
                } catch (Exception e) {
                    log.error("Jdbc close statement error: {}", e.getMessage());
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_JDBC;
    }


    private Statement getConnection(String username, String password, String url, Integer timeout) throws Exception {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(url)
                .username(username).password(password).build();
        Optional<JdbcConnect> cacheOption = connectionCommonCache.getCache(identifier, true);
        Statement statement = null;
        if (cacheOption.isPresent()) {
            JdbcConnect jdbcConnect = cacheOption.get();
            try {
                statement = jdbcConnect.getConnection().createStatement();
                // set query timeout
                int timeoutSecond = timeout / 1000;
                timeoutSecond = timeoutSecond <= 0 ? 1 : timeoutSecond;
                statement.setQueryTimeout(timeoutSecond);
                // set query max row number
                statement.setMaxRows(1000);
            } catch (Exception e) {
                log.info("The jdbc connect from cache, create statement error: {}", e.getMessage());
                try {
                    if (statement != null) {
                        statement.close();
                    }
                    jdbcConnect.close();
                } catch (Exception e2) {
                    log.error(e2.getMessage());
                }
                statement = null;
                connectionCommonCache.removeCache(identifier);
            }
        }
        if (statement != null) {
            return statement;
        }
        // renew connection when failed
        Connection connection = DriverManager.getConnection(url, username, password);
        statement = connection.createStatement();
        int timeoutSecond = timeout / 1000;
        timeoutSecond = timeoutSecond <= 0 ? 1 : timeoutSecond;
        statement.setQueryTimeout(timeoutSecond);
        statement.setMaxRows(1000);
        JdbcConnect jdbcConnect = new JdbcConnect(connection);
        connectionCommonCache.addCache(identifier, jdbcConnect);
        return statement;
    }

    /**
     * query one row record, response metrics header and one value row
     * eg:
     * query metrics：one tow three four
     * query sql：select one, tow, three, four from book limit 1;
     * @param statement statement
     * @param sql sql
     * @param columns query metrics field list
     * @throws Exception when error happen
     */
    private void queryOneRow(Statement statement, String sql, List<String> columns,
                                           CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        statement.setMaxRows(1);
        try (ResultSet resultSet = statement.executeQuery(sql)) {
            if (resultSet.next()) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String column : columns) {
                    if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                        long time = System.currentTimeMillis() - startTime;
                        valueRowBuilder.addColumns(String.valueOf(time));
                    } else {
                        String value = resultSet.getString(column);
                        value = value == null ? CommonConstants.NULL_VALUE : value;
                        valueRowBuilder.addColumns(value);
                    }
                }
                builder.addValues(valueRowBuilder.build());
            }
        }
    }

    /**
     * query two columns to mapping one row
     * eg:
     * query metrics：one two three four
     * query sql：select key, value from book; the key is the query metrics fields
     * select key, value from book; 
     * one    -  value1
     * two    -  value2
     * three  -  value3
     * four   -  value4
     * @param statement statement
     * @param sql sql
     * @param columns query metrics field list
     * @throws Exception when error happen
     */
    private void queryOneRowByMatchTwoColumns(Statement statement, String sql, List<String> columns,
                                              CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        try (ResultSet resultSet = statement.executeQuery(sql)) {
            HashMap<String, String> values = new HashMap<>(columns.size());
            while (resultSet.next()) {
                if (resultSet.getString(1) != null) {
                    values.put(resultSet.getString(1).toLowerCase().trim(), resultSet.getString(2));
                }
            }
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String column : columns) {
                if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                    long time = System.currentTimeMillis() - startTime;
                    valueRowBuilder.addColumns(String.valueOf(time));
                } else {
                    String value = values.get(column.toLowerCase());
                    value = value == null ? CommonConstants.NULL_VALUE : value;
                    valueRowBuilder.addColumns(value);
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    /**
     * query multi row record, response metrics header and multi value row
     * eg:
     * query metrics：one tow three four
     * query sql：select one, tow, three, four from book;
     * and return multi row record mapping with the metrics
     * @param statement statement
     * @param sql sql
     * @param columns query metrics field list
     * @throws Exception when error happen
     */
    private void queryMultiRow(Statement statement, String sql, List<String> columns,
                               CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        try (ResultSet resultSet = statement.executeQuery(sql)) {
            while (resultSet.next()) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String column : columns) {
                    if (CollectorConstants.RESPONSE_TIME.equals(column)) {
                        long time = System.currentTimeMillis() - startTime;
                        valueRowBuilder.addColumns(String.valueOf(time));
                    } else {
                        String value = resultSet.getString(column);
                        value = value == null ? CommonConstants.NULL_VALUE : value;
                        valueRowBuilder.addColumns(value);
                    }
                }
                builder.addValues(valueRowBuilder.build());
            }
        }
    }

    /**
     * construct jdbc url due the jdbc protocol
     * @param jdbcProtocol jdbc
     * @return URL
     */
    private String constructDatabaseUrl(JdbcProtocol jdbcProtocol) {
        if (Objects.nonNull(jdbcProtocol.getUrl())
                && !Objects.equals("", jdbcProtocol.getUrl())
                && jdbcProtocol.getUrl().startsWith("jdbc")) {
            // when has config jdbc url, use it 
            return jdbcProtocol.getUrl();
        }
        return switch (jdbcProtocol.getPlatform()) {
            case "mysql", "mariadb" ->
                    "jdbc:mysql://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase())
                    + "?useUnicode=true&characterEncoding=utf-8&useSSL=false";
            case "postgresql" ->
                    "jdbc:postgresql://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "clickhouse" ->
                    "jdbc:clickhouse://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "sqlserver" ->
                    "jdbc:sqlserver://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                    + ";" + (jdbcProtocol.getDatabase() == null ? "" : "DatabaseName=" + jdbcProtocol.getDatabase())
                    + ";trustServerCertificate=true;";
            case "oracle" ->
                    "jdbc:oracle:thin:@" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "dm" ->
                    "jdbc:dm://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort();
            default -> throw new IllegalArgumentException("Not support database platform: " + jdbcProtocol.getPlatform());
        };
    }
}
