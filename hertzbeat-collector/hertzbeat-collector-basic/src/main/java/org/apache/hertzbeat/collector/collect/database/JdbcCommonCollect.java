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

import java.nio.charset.StandardCharsets;
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
import org.apache.hertzbeat.collector.collect.common.cache.AbstractConnection;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.collect.common.cache.JdbcConnect;
import org.apache.hertzbeat.collector.collect.common.ssh.SshTunnelHelper;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.SshTunnel;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.sshd.common.SshException;
import org.apache.sshd.common.channel.exception.SshChannelOpenException;
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

    private static final String[] BLACK_LIST = {
            // dangerous SQL commands - may cause database structure damage or data leakage
            "create trigger", "create alias", "runscript from", "shutdown", "drop table",
            "drop database", "create function", "alter system", "grant all", "revoke all",

            // file IO related - may cause server files to be read or written
            "allowloadlocalinfile", "allowloadlocalinfileinpath", "uselocalinfile",

            // code execution related - may result in remote code execution
            "init=", "javaobjectserializer=", "runscript", "serverstatusdiffinterceptor",
            "queryinterceptors=", "statementinterceptors=", "exceptioninterceptors=",
            "xp_cmdshell", "create function", "dbms_java", "sp_sysexecute", "load_file",

            // multiple statement execution - may lead to SQL injection
            "allowmultiqueries",

            // deserialization related - may result in remote code execution
            "autodeserialize", "detectcustomcollations",
    };

    // universal bypass detection mode - applicable to all databases for dangerous command bypass detection
    private static final String[] UNIVERSAL_BYPASS_PATTERNS = {
            ".*create\\s*([/\\\\]|\\\\n|/n|\\n)\\s*trigger.*",
            ".*create\\s*([/\\\\]|\\\\n|/n|\\n)\\s*function.*",
            ".*drop\\s*([/\\\\]|\\\\n|/n|\\n)\\s*table.*",
            ".*drop\\s*([/\\\\]|\\\\n|/n|\\n)\\s*database.*",
            ".*run\\s*([/\\\\]|\\\\n|/n|\\n)\\s*script.*",
            ".*alter\\s*([/\\\\]|\\\\n|/n|\\n)\\s*system.*",
            ".*grant\\s*([/\\\\]|\\\\n|/n|\\n)\\s*all.*",
            ".*revoke\\s*([/\\\\]|\\\\n|/n|\\n)\\s*all.*",
            ".*xp\\s*([/\\\\]|\\\\n|/n|\\n)\\s*cmdshell.*",
            ".*load\\s*([/\\\\]|\\\\n|/n|\\n)\\s*file.*"
    };

    // database platform specific bypass detection mode
    private static final HashMap<String, String[]> PLATFORM_BYPASS_PATTERNS = new HashMap<>();

    static {
        // H2 database special character bypass mode
        PLATFORM_BYPASS_PATTERNS.put("h2", new String[]{
                ".*(\\\\\\\\|/|\\\\|\\\\n|/n|\\n)\\s*init\\s*=.*",
                ".*in\\s*([/\\\\]|\\\\n|/n|\\n)\\s*it\\s*=.*",
                ".*(\\\\\\\\|/|\\\\|\\\\n|/n|\\n)\\s*runscript\\s+from.*",
                ".*ru\\s*([/\\\\]|\\\\n|/n|\\n)\\s*script\\s+from.*"
        });

        // MySQL/MariaDB bypass mode
        String[] mysqlPatterns = {
                ".*allow\\s*([/\\\\]|\\\\n|/n|\\n)\\s*load\\s*([/\\\\]|\\\\n|/n|\\n)\\s*local\\s*([/\\\\]|\\\\n|/n|\\n)\\s*infile.*",
                ".*allow\\s*([/\\\\]|\\\\n|/n|\\n)\\s*multi\\s*([/\\\\]|\\\\n|/n|\\n)\\s*queries.*",
                ".*query\\s*([/\\\\]|\\\\n|/n|\\n)\\s*interceptors.*",
                ".*statement\\s*([/\\\\]|\\\\n|/n|\\n)\\s*interceptors.*",
                ".*exception\\s*([/\\\\]|\\\\n|/n|\\n)\\s*interceptors.*",
                ".*auto\\s*([/\\\\]|\\\\n|/n|\\n)\\s*deserialize.*"
        };
        PLATFORM_BYPASS_PATTERNS.put("mysql", mysqlPatterns);
        PLATFORM_BYPASS_PATTERNS.put("mariadb", mysqlPatterns);

        // PostgreSQL bypass mode
        PLATFORM_BYPASS_PATTERNS.put("postgresql", new String[]{
                ".*socket\\s*([/\\\\]|\\\\n|/n|\\n)\\s*factory.*",
                ".*logger\\s*([/\\\\]|\\\\n|/n|\\n)\\s*file.*",
                ".*ssl\\s*([/\\\\]|\\\\n|/n|\\n)\\s*mode.*",
                ".*logger\\s*([/\\\\]|\\\\n|/n|\\n)\\s*level.*"
        });

        // SQL Server bypass mode
        PLATFORM_BYPASS_PATTERNS.put("sqlserver", new String[]{
                ".*integrated\\s*([/\\\\]|\\\\n|/n|\\n)\\s*security.*",
                ".*authentication\\s*([/\\\\]|\\\\n|/n|\\n)\\s*scheme.*",
                ".*select\\s*([/\\\\]|\\\\n|/n|\\n)\\s*method.*",
                ".*send\\s*([/\\\\]|\\\\n|/n|\\n)\\s*string\\s*([/\\\\]|\\\\n|/n|\\n)\\s*parameters\\s*([/\\\\]|\\\\n|/n|\\n)\\s*as\\s*([/\\\\]|\\\\n|/n|\\n)\\s*unicode.*",
                ".*x\\s*([/\\\\]|\\\\n|/n|\\n)\\s*open\\s*([/\\\\]|\\\\n|/n|\\n)\\s*state.*",
                ".*application\\s*([/\\\\]|\\\\n|/n|\\n)\\s*intent.*"
        });

        // ClickHouse bypass mode
        PLATFORM_BYPASS_PATTERNS.put("clickhouse", new String[]{
                ".*custom\\s*([/\\\\]|\\\\n|/n|\\n)\\s*http\\s*([/\\\\]|\\\\n|/n|\\n)\\s*params.*",
                ".*http\\s*([/\\\\]|\\\\n|/n|\\n)\\s*connection\\s*([/\\\\]|\\\\n|/n|\\n)\\s*provider.*",
                ".*check\\s*([/\\\\]|\\\\n|/n|\\n)\\s*all\\s*([/\\\\]|\\\\n|/n|\\n)\\s*nodes.*",
                ".*fail\\s*([/\\\\]|\\\\n|/n|\\n)\\s*over.*",
                ".*use\\s*([/\\\\]|\\\\n|/n|\\n)\\s*objects\\s*([/\\\\]|\\\\n|/n|\\n)\\s*in\\s*([/\\\\]|\\\\n|/n|\\n)\\s*arrays.*"
        });

        // Oracle bypass mode
        PLATFORM_BYPASS_PATTERNS.put("oracle", new String[]{
                ".*oracle\\s*([/\\\\]|\\\\n|/n|\\n)\\s*jdbc.*",
                ".*oracle\\s*([/\\\\]|\\\\n|/n|\\n)\\s*net.*",
                ".*oracle\\.jdbc\\.timezoneinfotable\\s*=.*",
                ".*oracle\\.net\\.wallet_location\\s*=.*",
                ".*oracle\\.net\\.ssl_server_dn_match\\s*=\\s*false.*",
                ".*oracle\\.jdbc\\.enablesqlinjectionattack\\s*=\\s*true.*",
                ".*oracle\\.jdbc\\.implicitstatementcachesize\\s*=\\s*0.*",
                ".*oracle\\.jdbc\\.timezoneinfotable\\s*=.*",
                ".*oracle\\.net\\.wallet_location\\s*=.*",
                ".*oracle\\.net\\.ssl_server_dn_match\\s*=\\s*false.*",
                ".*oracle\\.jdbc\\.enablesqlinjectionattack\\s*=\\s*true.*",
                ".*oracle\\.jdbc\\.implicitstatementcachesize\\s*=\\s*0.*"
        });

        // DM bypass mode
        PLATFORM_BYPASS_PATTERNS.put("dm", new String[]{
                ".*login\\s*([/\\\\]|\\\\n|/n|\\n)\\s*mode.*",
                ".*compatible\\s*([/\\\\]|\\\\n|/n|\\n)\\s*mode.*",
                ".*en\\s*([/\\\\]|\\\\n|/n|\\n)\\s*crypt.*",
                ".*ci\\s*([/\\\\]|\\\\n|/n|\\n)\\s*pher.*"
        });
    }

    private final GlobalConnectionCache connectionCommonCache = GlobalConnectionCache.getInstance();


    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getJdbc() == null) {
            throw new IllegalArgumentException("Database collect must has jdbc params");
        }
        if (StringUtils.hasText(metrics.getJdbc().getUrl())) {
            String url = metrics.getJdbc().getUrl().toLowerCase();
            for (String keyword : VULNERABLE_KEYWORDS) {
                if (url.contains(keyword.toLowerCase())) {
                    throw new IllegalArgumentException("Jdbc url prohibit contains vulnerable param " + keyword);
                }
            }
        }
        SshTunnelHelper.checkTunnelParam(metrics.getJdbc().getSshTunnel());
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        JdbcProtocol jdbcProtocol = metrics.getJdbc();
        SshTunnel sshTunnel = jdbcProtocol.getSshTunnel();

        int timeout = CollectUtil.getTimeout(jdbcProtocol.getTimeout());
        boolean reuseConnection = Boolean.parseBoolean(jdbcProtocol.getReuseConnection());
        Statement statement = null;
        String databaseUrl;
        try {
            if (sshTunnel != null && Boolean.parseBoolean(sshTunnel.getEnable())) {
                int localPort = SshTunnelHelper.localPortForward(sshTunnel, jdbcProtocol.getHost(), jdbcProtocol.getPort());
                databaseUrl = constructDatabaseUrl(jdbcProtocol, "localhost", String.valueOf(localPort));
            } else {
                databaseUrl = constructDatabaseUrl(jdbcProtocol, jdbcProtocol.getHost(), jdbcProtocol.getPort());
            }

            statement = getConnection(jdbcProtocol.getUsername(),
                    jdbcProtocol.getPassword(), databaseUrl, timeout, reuseConnection);
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
        } catch (SshException sshException) {
            Throwable throwable = sshException.getCause();
            if (throwable instanceof SshChannelOpenException) {
                log.warn("[Jdbc collect] Remote ssh server no more session channel, please increase sshd_config MaxSessions.");
            }
            String errorMsg = CommonUtil.getMessageFromThrowable(sshException);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer ssh connection failed: " + errorMsg);
        } catch (Exception e) {
            String errorMessage = CommonUtil.getMessageFromThrowable(e);
            log.error("Jdbc error: {}.", errorMessage, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Query Error: " + errorMessage);
        } finally {
            if (statement != null) {
                Connection connection = null;
                try {
                    connection = statement.getConnection();
                    statement.close();
                } catch (Exception e) {
                    log.error("Jdbc close statement error: {}", e.getMessage());
                }
                try {
                    if (!reuseConnection && connection != null) {
                        connection.close();
                    }
                } catch (Exception e) {
                    log.error("Jdbc close connection error: {}", e.getMessage());
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_JDBC;
    }


    private Statement getConnection(String username, String password, String url, Integer timeout, boolean reuseConnection) throws Exception {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(url)
                .username(username).password(password).build();
        Statement statement = null;
        if (reuseConnection) {
            Optional<AbstractConnection<?>> cacheOption = connectionCommonCache.getCache(identifier, true);
            if (cacheOption.isPresent()) {
                JdbcConnect jdbcConnect = (JdbcConnect) cacheOption.get();
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
        }
        // renew connection when failed
        Connection connection = DriverManager.getConnection(url, username, password);
        connection.setReadOnly(true);
        statement = connection.createStatement();
        int timeoutSecond = timeout / 1000;
        timeoutSecond = timeoutSecond <= 0 ? 1 : timeoutSecond;
        statement.setQueryTimeout(timeoutSecond);
        statement.setMaxRows(1000);
        if (reuseConnection) {
            JdbcConnect jdbcConnect = new JdbcConnect(connection);
            connectionCommonCache.addCache(identifier, jdbcConnect);
        }
        return statement;
    }

    /**
     * query one row record, response metrics header and one value row
     * eg:
     * query metrics：one tow three four
     * query sql：select one, tow, three, four from book limit 1;
     *
     * @param statement statement
     * @param sql       sql
     * @param columns   query metrics field list
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
                        valueRowBuilder.addColumn(String.valueOf(time));
                    } else {
                        String value = resultSet.getString(column);
                        value = value == null ? CommonConstants.NULL_VALUE : value;
                        valueRowBuilder.addColumn(value);
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
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
     *
     * @param statement statement
     * @param sql       sql
     * @param columns   query metrics field list
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
                    valueRowBuilder.addColumn(String.valueOf(time));
                } else {
                    String value = values.get(column.toLowerCase());
                    value = value == null ? CommonConstants.NULL_VALUE : value;
                    valueRowBuilder.addColumn(value);
                }
            }
            builder.addValueRow(valueRowBuilder.build());
        }
    }

    /**
     * query multi row record, response metrics header and multi value row
     * eg:
     * query metrics：one tow three four
     * query sql：select one, tow, three, four from book;
     * and return multi row record mapping with the metrics
     *
     * @param statement statement
     * @param sql       sql
     * @param columns   query metrics field list
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
                        valueRowBuilder.addColumn(String.valueOf(time));
                    } else {
                        String value = resultSet.getString(column);
                        value = value == null ? CommonConstants.NULL_VALUE : value;
                        valueRowBuilder.addColumn(value);
                    }
                }
                builder.addValueRow(valueRowBuilder.build());
            }
        }
    }

    /**
     * Recursively decode the URL to prevent multiple encoding bypasses.
     *
     * @param url jdbc url
     * @return decoded decoded jdbc url
     */
    private String recursiveDecode(String url) {
        String prev;
        String decoded = url;
        int max = 5; // Decode it at most 5 times to prevent infinite loops.
        do {
            prev = decoded;
            try {
                decoded = java.net.URLDecoder.decode(prev, StandardCharsets.UTF_8);
            } catch (Exception e) {
                break;
            }
        } while (!prev.equals(decoded) && --max > 0);
        return decoded;
    }

    /**
     * construct jdbc url due the jdbc protocol
     *
     * @param jdbcProtocol jdbc
     * @return URL
     */
    private String constructDatabaseUrl(JdbcProtocol jdbcProtocol, String host, String port) {
        if (Objects.nonNull(jdbcProtocol.getUrl())
                && !Objects.equals("", jdbcProtocol.getUrl())
                && jdbcProtocol.getUrl().startsWith("jdbc")) {
            // limit url length
            if (jdbcProtocol.getUrl().length() > 2048) {
                throw new IllegalArgumentException("JDBC URL length exceeds maximum limit of 2048 characters");
            }
            // remove special characters
            String cleanedUrl = jdbcProtocol.getUrl().replaceAll("[\\x00-\\x1F\\x7F\\xA0]", "");
            String url = recursiveDecode(cleanedUrl);
            String urlLowerCase = url.toLowerCase();
            // url format check
            if (!urlLowerCase.matches("^jdbc:[a-zA-Z0-9]+:([^\\s;]+)(;[^\\s;]+)*$")) {
                throw new IllegalArgumentException("Invalid JDBC URL format");
            }
            // backlist check
            for (String keyword : BLACK_LIST) {
                if (urlLowerCase.contains(keyword.toLowerCase())) {
                    throw new IllegalArgumentException("Invalid JDBC URL: contains potentially malicious parameter: " + keyword);
                }
            }
            // universal detection
            String normalizedUrl = urlLowerCase.replaceAll("[\\x00-\\x1F\\x7F\\xA0]", " ");
            // universal detection of JDBC injection and deserialization attacks
            if (normalizedUrl.matches(".*jndi\\s*[:=].*")
                    || normalizedUrl.matches(".*ldap\\s*[:=].*")
                    || normalizedUrl.matches(".*rmi\\s*[:=].*")
                    || normalizedUrl.matches(".*java\\s*[:=].*")
                    || normalizedUrl.matches(".*serialization\\s*[:=].*")
                    || normalizedUrl.matches(".*deserializ.*\\s*[:=].*")
                    || normalizedUrl.matches(".*objectinputstream\\s*[:=].*")
                    || normalizedUrl.matches(".*readobject\\s*[:=].*")) {
                throw new IllegalArgumentException("Invalid JDBC URL: contains potentially malicious JNDI or deserialization parameter");
            }
            // universal detection of bypass
            for (String pattern : UNIVERSAL_BYPASS_PATTERNS) {
                if (normalizedUrl.matches(pattern)) {
                    throw new IllegalArgumentException("Invalid JDBC URL: contains potentially malicious bypass pattern");
                }
            }
            // database platform specific bypass detection
            if (jdbcProtocol.getPlatform() != null) {
                String platform = jdbcProtocol.getPlatform().toLowerCase();
                // check for specific bypass modes on the platform
                String[] platformPatterns = PLATFORM_BYPASS_PATTERNS.get(platform);
                if (platformPatterns != null) {
                    for (String pattern : platformPatterns) {
                        if (normalizedUrl.matches(pattern)) {
                            throw new IllegalArgumentException("Invalid " + platform.toUpperCase() + " JDBC URL: contains potentially malicious bypass pattern");
                        }
                    }
                }
            }
            return url;
        }
        assert jdbcProtocol.getPlatform() != null;
        return switch (jdbcProtocol.getPlatform()) {
            case "mysql", "mariadb" -> "jdbc:mysql://" + host + ":" + port
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase())
                    + "?useUnicode=true&characterEncoding=utf-8&useSSL=false";
            case "postgresql" -> "jdbc:postgresql://" + host + ":" + port
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "clickhouse" -> "jdbc:clickhouse://" + host + ":" + port
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "sqlserver" -> "jdbc:sqlserver://" + host + ":" + port
                    + ";" + (jdbcProtocol.getDatabase() == null ? "" : "DatabaseName=" + jdbcProtocol.getDatabase())
                    + ";trustServerCertificate=true;";
            case "oracle" -> "jdbc:oracle:thin:@" + host + ":" + port
                    + "/" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase());
            case "dm" -> "jdbc:dm://" + host + ":" + port;
            case "testcontainers" -> "jdbc:tc:" + host + ":" + port
                    + ":///" + (jdbcProtocol.getDatabase() == null ? "" : jdbcProtocol.getDatabase()) + "?user=root&password=root";
            default -> throw new IllegalArgumentException("Not support database platform: " + jdbcProtocol.getPlatform());
        };
    }
}
