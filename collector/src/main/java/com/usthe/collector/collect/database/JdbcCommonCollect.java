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

package com.usthe.collector.collect.database;

import com.mysql.cj.jdbc.exceptions.CommunicationsException;
import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.JdbcConnect;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.JdbcProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.util.PSQLException;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * 数据库JDBC通用查询
 * @author tomsun28
 * @date 2021/12/1 21:37
 */
@Slf4j
public class JdbcCommonCollect extends AbstractCollect {

    private static final String QUERY_TYPE_ONE_ROW = "oneRow";
    private static final String QUERY_TYPE_MULTI_ROW = "multiRow";
    private static final String QUERY_TYPE_COLUMNS = "columns";

    public JdbcCommonCollect(){}

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 简单校验必有参数
        if (metrics == null || metrics.getJdbc() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("DATABASE collect must has jdbc params");
            return;
        }
        JdbcProtocol jdbcProtocol = metrics.getJdbc();
        String databaseUrl = constructDatabaseUrl(jdbcProtocol);
        // 查询超时时间默认6000毫秒
        int timeout = CollectUtil.getTimeout(jdbcProtocol.getTimeout());
        try {
            Statement statement = getConnection(jdbcProtocol.getUsername(),
                    jdbcProtocol.getPassword(), databaseUrl, timeout);
            switch (jdbcProtocol.getQueryType()) {
                case QUERY_TYPE_ONE_ROW:
                    queryOneRow(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                    break;
                case QUERY_TYPE_MULTI_ROW:
                    queryMultiRow(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                    break;
                case QUERY_TYPE_COLUMNS:
                    queryOneRowByMatchTwoColumns(statement, jdbcProtocol.getSql(), metrics.getAliasFields(), builder, startTime);
                    break;
                default:
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Not support database query type: " + jdbcProtocol.getQueryType());
                    break;
            }
        } catch (CommunicationsException communicationsException) {
            log.warn("Jdbc sql error: {}, code: {}.", communicationsException.getMessage(), communicationsException.getErrorCode());
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("Error: " + communicationsException.getMessage() + " Code: " + communicationsException.getErrorCode());
        } catch (PSQLException psqlException) {
            // for PostgreSQL 08001
            if (CollectorConstants.POSTGRESQL_UN_REACHABLE_CODE.equals(psqlException.getSQLState())) {
                // 对端链接失败 不可达
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
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_JDBC;
    }


    private Statement getConnection(String username, String password, String url,Integer timeout) throws Exception {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(url)
                .username(username).password(password).build();
        Optional<Object> cacheOption = CommonCache.getInstance().getCache(identifier, true);
        Statement statement = null;
        if (cacheOption.isPresent()) {
            JdbcConnect jdbcConnect = (JdbcConnect) cacheOption.get();
            try {
                statement = jdbcConnect.getConnection().createStatement();
                // 设置查询超时时间10秒
                int timeoutSecond = timeout / 1000;
                timeoutSecond = timeoutSecond <= 0 ? 1 : timeoutSecond;
                statement.setQueryTimeout(timeoutSecond);
                // 设置查询最大行数1000行
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
                CommonCache.getInstance().removeCache(identifier);
            }
        }
        if (statement != null) {
            return statement;
        }
        // 复用失败则新建连接
        Connection connection = DriverManager.getConnection(url, username, password);
        statement = connection.createStatement();
        // 设置查询超时时间10秒
        int timeoutSecond = timeout / 1000;
        timeoutSecond = timeoutSecond <= 0 ? 1 : timeoutSecond;
        statement.setQueryTimeout(timeoutSecond);
        // 设置查询最大行数1000行
        statement.setMaxRows(1000);
        JdbcConnect jdbcConnect = new JdbcConnect(connection);
        CommonCache.getInstance().addCache(identifier, jdbcConnect);
        return statement;
    }

    /**
     * 查询一行数据, 通过查询返回结果集的列名称，和查询的字段映射
     * eg:
     * 查询字段：one tow three four
     * 查询SQL：select one, tow, three, four from book limit 1;
     * @param statement 执行器
     * @param sql sql
     * @param columns 查询的列头(一般是数据库表字段，也可能包含特殊字段,eg: responseTime)
     * @throws Exception when error happen
     */
    private void queryOneRow(Statement statement, String sql, List<String> columns,
                                           CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        statement.setMaxRows(1);
        ResultSet resultSet = statement.executeQuery(sql);
        try {
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
        } finally {
            resultSet.close();
        }
    }

    /**
     * 查询一行数据, 通过查询的两列数据(key-value)，key和查询的字段匹配，value为查询字段的值
     * eg:
     * 查询字段：one two three four
     * 查询SQL：select key, value from book;
     * 返回的key映射查询字段
     * @param statement 执行器
     * @param sql sql
     * @param columns 查询的列头(一般是数据库表字段，也可能包含特殊字段,eg: responseTime)
     * @throws Exception when error happen
     */
    private void queryOneRowByMatchTwoColumns(Statement statement, String sql, List<String> columns,
                                              CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        ResultSet resultSet = statement.executeQuery(sql);
        try {
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
        } finally {
            resultSet.close();
        }
    }

    /**
     * 查询多行数据, 通过查询返回结果集的列名称，和查询的字段映射
     * eg:
     * 查询字段：one tow three four
     * 查询SQL：select one, tow, three, four from book;
     * @param statement 执行器
     * @param sql sql
     * @param columns 查询的列头(一般是数据库表字段，也可能包含特殊字段,eg: responseTime)
     * @throws Exception when error happen
     */
    private void queryMultiRow(Statement statement, String sql, List<String> columns,
                               CollectRep.MetricsData.Builder builder, long startTime) throws Exception {
        ResultSet resultSet = statement.executeQuery(sql);
        try {
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
        } finally {
            resultSet.close();
        }
    }

    /**
     * 根据jdbc入参构造数据库URL
     * @param jdbcProtocol jdbc
     * @return URL
     */
    private String constructDatabaseUrl(JdbcProtocol jdbcProtocol) {
        if (Objects.nonNull(jdbcProtocol.getUrl())
                && !Objects.equals("", jdbcProtocol.getUrl())
                && jdbcProtocol.getUrl().startsWith("jdbc")) {
            // 入参数URL有效 则优先级最高返回
            return jdbcProtocol.getUrl();
        }
        String url;
        switch (jdbcProtocol.getPlatform()) {
            case "mysql":
            case "mariadb":
                url = "jdbc:mysql://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                        + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase())
                        + "?useUnicode=true&characterEncoding=utf-8&useSSL=false";
                break;
            case "postgresql":
                url = "jdbc:postgresql://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                        + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
                break;
            case "clickhouse":
                url = "jdbc:clickhouse://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                        + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
                break;
            case "sqlserver":
                url = "jdbc:sqlserver://" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                        + ";" + (jdbcProtocol.getDatabase() == null ? "" : "DatabaseName=" + jdbcProtocol.getDatabase());
                break;
            case "oracle":
                url = "jdbc:oracle:thin:@" + jdbcProtocol.getHost() + ":" + jdbcProtocol.getPort()
                        + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
                break;
            case "dm":
                url = "jdbc:dm://" + jdbcProtocol.getHost() + ":" +jdbcProtocol.getPort();
                break;
            default:
                throw new IllegalArgumentException("Not support database platform: " + jdbcProtocol.getPlatform());

        }
        return url;
    }
}
