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

package org.apache.hertzbeat.collector.collect.database.mysql;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.hertzbeat.collector.collect.common.ssh.SshTunnelHelper;
import org.apache.hertzbeat.collector.collect.database.query.JdbcQueryExecutor;
import org.apache.hertzbeat.collector.collect.database.query.JdbcQueryExecutorRegistry;
import org.apache.hertzbeat.collector.collect.database.query.JdbcQueryRowSet;
import org.apache.hertzbeat.collector.mysql.r2dbc.MysqlQueryExecutor;
import org.apache.hertzbeat.collector.mysql.r2dbc.QueryOptions;
import org.apache.hertzbeat.collector.mysql.r2dbc.QueryResult;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.SshTunnel;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * MySQL-compatible query-only adapter that lets JdbcCommonCollect execute read-only queries through the built-in
 * R2DBC path when no MySQL JDBC driver is present.
 */
@Component
public class MysqlR2dbcJdbcQueryExecutor implements JdbcQueryExecutor, InitializingBean, DisposableBean {

    private static final String QUERY_TYPE_ONE_ROW = "oneRow";
    private static final String QUERY_TYPE_MULTI_ROW = "multiRow";
    private static final String QUERY_TYPE_COLUMNS = "columns";

    private final MysqlCollectorProperties properties;
    private final MysqlQueryExecutor mysqlQueryExecutor;
    private final MysqlJdbcDriverAvailability mysqlJdbcDriverAvailability;

    public MysqlR2dbcJdbcQueryExecutor(MysqlCollectorProperties properties,
                                       MysqlQueryExecutor mysqlQueryExecutor,
                                       MysqlJdbcDriverAvailability mysqlJdbcDriverAvailability) {
        this.properties = properties;
        this.mysqlQueryExecutor = mysqlQueryExecutor;
        this.mysqlJdbcDriverAvailability = mysqlJdbcDriverAvailability;
    }

    @Override
    public boolean supports(Metrics metrics) {
        if (metrics == null || metrics.getJdbc() == null) {
            return false;
        }
        JdbcProtocol jdbcProtocol = metrics.getJdbc();
        if (!isMysqlCompatiblePlatform(jdbcProtocol.getPlatform())) {
            return false;
        }
        String queryType = jdbcProtocol.getQueryType();
        return properties.useR2dbc(mysqlJdbcDriverAvailability.hasMysqlJdbcDriver())
                && (QUERY_TYPE_ONE_ROW.equals(queryType)
                || QUERY_TYPE_MULTI_ROW.equals(queryType)
                || QUERY_TYPE_COLUMNS.equals(queryType));
    }

    private boolean isMysqlCompatiblePlatform(String platform) {
        return "mysql".equalsIgnoreCase(platform) || "mariadb".equalsIgnoreCase(platform);
    }

    @Override
    public JdbcQueryRowSet executeQuery(Metrics metrics, int timeout, int maxRows) {
        JdbcProtocol jdbcProtocol = metrics.getJdbc();
        QueryOptions options = buildQueryOptions(jdbcProtocol, timeout, maxRows);
        QueryResult queryResult = mysqlQueryExecutor.execute(jdbcProtocol.getSql(), options);
        if (queryResult.hasError()) {
            throw new IllegalStateException("R2DBC MySQL query failed: " + queryResult.getError());
        }
        return new QueryResultRowSet(queryResult);
    }

    @Override
    public void afterPropertiesSet() {
        JdbcQueryExecutorRegistry.register(this);
    }

    @Override
    public void destroy() {
        JdbcQueryExecutorRegistry.unregister(this);
    }

    private QueryOptions buildQueryOptions(JdbcProtocol jdbcProtocol, int timeout, int maxRows) {
        MysqlTarget target = resolveTarget(jdbcProtocol);
        SshTunnel sshTunnel = jdbcProtocol.getSshTunnel();
        String host = target.host();
        int port = target.port();
        if (sshTunnel != null && Boolean.parseBoolean(sshTunnel.getEnable())) {
            try {
                int localPort = SshTunnelHelper.localPortForward(sshTunnel, host, String.valueOf(port));
                host = "127.0.0.1";
                port = localPort;
            } catch (Exception exception) {
                throw new IllegalStateException("R2DBC MySQL query adapter failed to establish SSH tunnel", exception);
            }
        }
        return QueryOptions.builder()
                .host(host)
                .port(port)
                .username(jdbcProtocol.getUsername())
                .password(jdbcProtocol.getPassword())
                .database(target.database())
                .schema(target.database())
                .timeout(Duration.ofMillis(timeout))
                .maxRows(maxRows)
                .fetchSize(256)
                .readOnly(true)
                .build();
    }

    private MysqlTarget resolveTarget(JdbcProtocol jdbcProtocol) {
        if (StringUtils.hasText(jdbcProtocol.getUrl())) {
            return parseJdbcUrl(jdbcProtocol.getUrl(), jdbcProtocol.getDatabase());
        }
        if (!StringUtils.hasText(jdbcProtocol.getHost()) || !StringUtils.hasText(jdbcProtocol.getPort())) {
            throw new IllegalArgumentException("R2DBC MySQL query adapter requires host/port or a jdbc:mysql URL");
        }
        return new MysqlTarget(jdbcProtocol.getHost(), Integer.parseInt(jdbcProtocol.getPort()), jdbcProtocol.getDatabase());
    }

    private MysqlTarget parseJdbcUrl(String url, String fallbackDatabase) {
        String trimmed = url.trim();
        if (!(trimmed.startsWith("jdbc:mysql://") || trimmed.startsWith("jdbc:mariadb://"))) {
            throw new IllegalArgumentException("R2DBC MySQL query adapter only supports jdbc:mysql:// or jdbc:mariadb:// URLs");
        }
        URI uri = URI.create(trimmed.substring("jdbc:".length()));
        String host = uri.getHost();
        int port = uri.getPort() > 0 ? uri.getPort() : 3306;
        if (!StringUtils.hasText(host)) {
            throw new IllegalArgumentException("R2DBC MySQL query adapter URL must include a host");
        }
        String path = uri.getPath();
        String database = StringUtils.hasText(path) && path.length() > 1 ? path.substring(1) : fallbackDatabase;
        return new MysqlTarget(host, port, database);
    }

    private record MysqlTarget(String host, int port, String database) {
    }

    private static final class QueryResultRowSet implements JdbcQueryRowSet {

        private final List<List<String>> rows;
        private final Map<String, Integer> columnIndexMap;
        private int currentIndex = -1;

        private QueryResultRowSet(QueryResult queryResult) {
            this.rows = queryResult.getRows();
            this.columnIndexMap = buildColumnIndexMap(queryResult.getColumns());
        }

        @Override
        public boolean next() {
            currentIndex++;
            return currentIndex < rows.size();
        }

        @Override
        public String getString(String column) {
            Integer index = columnIndexMap.get(column.toLowerCase(Locale.ROOT));
            if (index == null) {
                throw new IllegalArgumentException("Column not found in R2DBC MySQL result: " + column);
            }
            return getString(index + 1);
        }

        @Override
        public String getString(int index) {
            if (currentIndex < 0 || currentIndex >= rows.size()) {
                throw new IllegalStateException("R2DBC MySQL result cursor is not positioned on a row");
            }
            int zeroBased = index - 1;
            List<String> row = rows.get(currentIndex);
            if (zeroBased < 0 || zeroBased >= row.size()) {
                throw new IllegalArgumentException("Column index out of bounds in R2DBC MySQL result: " + index);
            }
            return row.get(zeroBased);
        }

        @Override
        public void close() {
            // QueryResult is fully materialized, so there is nothing left to close here.
        }

        private static Map<String, Integer> buildColumnIndexMap(List<String> columns) {
            Map<String, Integer> indexMap = new HashMap<>(columns.size());
            for (int index = 0; index < columns.size(); index++) {
                indexMap.put(columns.get(index).toLowerCase(Locale.ROOT), index);
            }
            return indexMap;
        }
    }
}
