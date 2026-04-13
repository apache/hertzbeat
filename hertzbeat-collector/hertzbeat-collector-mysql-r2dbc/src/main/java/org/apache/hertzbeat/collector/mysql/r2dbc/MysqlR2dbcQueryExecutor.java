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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import io.asyncer.r2dbc.mysql.MySqlConnectionFactory;
import io.asyncer.r2dbc.mysql.constant.SslMode;
import io.r2dbc.spi.Connection;
import io.r2dbc.spi.Statement;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeoutException;
import reactor.core.publisher.Mono;

/**
 * Collector-side MySQL query executor backed by R2DBC.
 */
public class MysqlR2dbcQueryExecutor implements MysqlQueryExecutor {

    private final MysqlR2dbcConnectionFactoryProvider connectionFactoryProvider;
    private final ResultSetMapper resultSetMapper;
    private final SqlGuard sqlGuard;

    public MysqlR2dbcQueryExecutor(MysqlR2dbcConnectionFactoryProvider connectionFactoryProvider,
                                   ResultSetMapper resultSetMapper,
                                   SqlGuard sqlGuard) {
        this.connectionFactoryProvider = connectionFactoryProvider;
        this.resultSetMapper = resultSetMapper;
        this.sqlGuard = sqlGuard;
    }

    @Override
    public QueryResult execute(String sql, QueryOptions options) {
        String normalizedSql = sqlGuard.normalizeAndValidate(sql);
        QueryResult firstAttempt = executeOnce(normalizedSql, options, SslMode.PREFERRED);
        if (!firstAttempt.hasError() || !shouldRetryWithoutSsl(firstAttempt.getError())) {
            return firstAttempt;
        }
        QueryResult fallbackAttempt = executeOnce(normalizedSql, options, SslMode.DISABLED);
        if (!fallbackAttempt.hasError()) {
            return fallbackAttempt;
        }
        if (requiresSslCompatibleAuth(fallbackAttempt.getError())) {
            return QueryResult.builder()
                    .error(fallbackAttempt.getError()
                            + ". This route currently needs a TLS-compatible runtime or a mysql_native_password monitoring user.")
                    .build();
        }
        return fallbackAttempt;
    }

    private QueryResult executeOnce(String sql, QueryOptions options, SslMode sslMode) {
        MySqlConnectionFactory connectionFactory = connectionFactoryProvider.create(options, sslMode);
        Duration timeout = options.getTimeout().plusSeconds(1);
        Connection connection = null;
        try {
            connection = Mono.from(connectionFactory.create()).block(timeout);
            if (connection == null) {
                return QueryResult.builder().error("R2DBC MySQL collector route could not create a connection").build();
            }
            QueryResult result = map(connection, sql, options).block(timeout);
            if (result == null) {
                return QueryResult.builder().error("R2DBC MySQL collector route returned no result").build();
            }
            return result;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            String message = extractErrorMessage(exception, options.getTimeout());
            return QueryResult.builder()
                    .error(message)
                    .build();
        } finally {
            if (connection != null) {
                safelyClose(connection);
            }
        }
    }

    private void safelyClose(Connection connection) {
        try {
            Mono.from(connection.close())
                    .timeout(Duration.ofSeconds(1), Mono.empty())
                    .onErrorResume(error -> Mono.empty())
                    .block(Duration.ofSeconds(2));
        } catch (Exception ignored) {
            // Best-effort close only. Query completion must not be turned into a failure by cleanup.
        }
    }

    private String extractErrorMessage(Exception exception, Duration timeout) {
        if (isTimeoutException(exception)) {
            return "Query timed out after " + timeout.toMillis() + "ms";
        }
        String message = exception.getMessage();
        if ((message == null || message.isBlank()) && exception.getCause() != null) {
            message = exception.getCause().getMessage();
        }
        return message == null || message.isBlank() ? exception.getClass().getSimpleName() : message;
    }

    private boolean isTimeoutException(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof TimeoutException) {
                return true;
            }
            String message = current.getMessage();
            if (message != null && message.toLowerCase(Locale.ROOT).contains("timeout on blocking read")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private boolean shouldRetryWithoutSsl(String error) {
        if (error == null) {
            return false;
        }
        String normalized = error.toLowerCase(Locale.ROOT);
        return normalized.contains("handshake_failure")
                || normalized.contains("ssl/tls handshake")
                || normalized.contains("closedchannelexception")
                || normalized.contains("connection unexpectedly closed");
    }

    private boolean requiresSslCompatibleAuth(String error) {
        if (error == null) {
            return false;
        }
        String normalized = error.toLowerCase(Locale.ROOT);
        return normalized.contains("caching_sha2_password")
                || normalized.contains("must require ssl");
    }

    private Mono<QueryResult> map(Connection connection, String sql, QueryOptions options) {
        Statement statement = connection.createStatement(sql);
        // Keep the query path read-only and deterministic, and let JdbcCommonCollect own the existing parser flow.
        return resultSetMapper.map(statement, options.getTimeout(), options.getMaxRows());
    }
}
