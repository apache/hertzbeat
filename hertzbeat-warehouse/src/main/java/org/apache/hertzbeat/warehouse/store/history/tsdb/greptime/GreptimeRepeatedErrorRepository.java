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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.Objects;
import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.apache.hertzbeat.common.observability.gateway.TelemetrySourceContext;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.apache.hertzbeat.warehouse.repository.RepeatedErrorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Optional prepared read path restricted to repeated ERRORs; the HTTP executor remains unchanged. */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeRepeatedErrorRepository implements RepeatedErrorRepository {
    private final Callable<Connection> connections;
    private final GreptimeQueryGuard guard;
    private final Semaphore admission = new Semaphore(2);

    @Autowired
    public GreptimeRepeatedErrorRepository(GreptimeProperties properties, GreptimeQueryGuard guard,
            @Value("${warehouse.store.greptime.query.repeated-errors-jdbc-url:}") String jdbcUrl) {
        this(jdbcUrl.isBlank() ? null : connectionFactory(properties, jdbcUrl), guard);
    }

    GreptimeRepeatedErrorRepository(Callable<Connection> connections, GreptimeQueryGuard guard) {
        this.connections = connections;
        this.guard = guard;
    }

    @Override
    public LogRepeatedErrors.Result summary(LogRepeatedErrors.Scope scope) {
        if (connections == null || TelemetrySourceContext.isSelf()) return LogRepeatedErrors.unavailable("unsupported", scope);
        try {
            return guard.execute(() -> {
                if (!admission.tryAcquire()) return LogRepeatedErrors.unavailable("over_budget", scope);
                try (var connection = connections.call()) {
                    return summary(connection, scope);
                } finally {
                    admission.release();
                }
            });
        } catch (RuntimeException failure) {
            return LogRepeatedErrors.unavailable("unavailable", scope);
        }
    }

    private LogRepeatedErrors.Result summary(Connection connection, LogRepeatedErrors.Scope scope) throws SQLException {
        var query = GreptimeRepeatedErrorSql.groups(scope);
        try (var statement = prepare(connection, query); var rows = statement.executeQuery()) {
            var groups = new ArrayList<LogRepeatedErrors.Group>();
            Long matching = null;
            while (rows.next()) {
                long count = rows.getLong("population_count");
                if (count > LogRepeatedErrors.ROW_BUDGET || rows.getLong("longest_message") > LogRepeatedErrors.MESSAGE_BUDGET) {
                    return LogRepeatedErrors.unavailable("over_budget", scope);
                }
                if (matching != null && matching != count) throw new SQLException("Inconsistent population evidence");
                matching = count;
                if (rows.getObject("event_count") == null) continue;
                var service = rows.getString("service_name");
                var environment = rows.getString("environment");
                var body = rows.getString("body");
                groups.add(new LogRepeatedErrors.Group(LogRepeatedErrors.groupKey(scope, service, environment, body),
                        service, environment, rows.getLong("event_count"), rows.getLong("last_seen"),
                        safeSummary(body), rows.getString("representative_uid")));
            }
            if (matching == null) throw new SQLException("Missing population evidence");
            return new LogRepeatedErrors.Result("ready", scope, "window", matching, groups);
        }
    }

    @Override
    public LogRepeatedErrors.Records records(LogRepeatedErrors.Scope scope, LogRepeatedErrors.Selection selection) {
        if (connections == null || TelemetrySourceContext.isSelf()) return recordsState("unsupported", scope, selection);
        try {
            return guard.execute(() -> {
                if (!admission.tryAcquire()) return recordsState("over_budget", scope, selection);
                try (var connection = connections.call()) {
                    var evidence = summary(connection, scope);
                    if (!"ready".equals(evidence.state())) return recordsState(evidence.state(), scope, selection);
                    return records(connection, scope, selection);
                } finally {
                    admission.release();
                }
            });
        } catch (RuntimeException failure) {
            return recordsState("unavailable", scope, selection);
        }
    }

    private LogRepeatedErrors.Records records(Connection connection, LogRepeatedErrors.Scope scope,
            LogRepeatedErrors.Selection selection) throws SQLException {
        String service;
        String environment;
        String body;
        try (var statement = prepare(connection, GreptimeRepeatedErrorSql.representative(scope, selection));
                var rows = statement.executeQuery()) {
            if (!rows.next()) return recordsState("missing", scope, selection);
            service = rows.getString("service_name");
            environment = rows.getString("environment");
            body = rows.getString("body");
            if (rows.next() || !selection.groupKey().equals(LogRepeatedErrors.groupKey(scope, service, environment, body))) {
                return recordsState("missing", scope, selection);
            }
        }
        var records = new ArrayList<LogRepeatedErrors.Record>();
        try (var statement = prepare(connection, GreptimeRepeatedErrorSql.exactRecords(scope, service, environment, body));
                var rows = statement.executeQuery()) {
            while (rows.next()) records.add(new LogRepeatedErrors.Record(rows.getString("log_record_uid"), rows.getLong("event_time")));
        }
        return new LogRepeatedErrors.Records("ready", scope, selection, records);
    }

    private static java.sql.PreparedStatement prepare(Connection connection, GreptimeRepeatedErrorSql.Bound query)
            throws SQLException {
        var statement = connection.prepareStatement(query.sql());
        try {
            statement.setQueryTimeout(2);
            for (int index = 0; index < query.parameters().size(); index++) {
                var value = query.parameters().get(index);
                if (value instanceof Long number) statement.setLong(index + 1, number);
                else if (value instanceof String text) statement.setString(index + 1, text);
                else throw new SQLException("Unsupported repeated error parameter");
            }
            return statement;
        } catch (SQLException failure) {
            statement.close();
            throw failure;
        }
    }

    private static Callable<Connection> connectionFactory(GreptimeProperties properties, String jdbcUrl) {
        validateEndpoint(properties, jdbcUrl);
        var settings = new Properties();
        if (properties.username() != null) settings.setProperty("user", properties.username());
        if (properties.password() != null) settings.setProperty("password", properties.password());
        settings.setProperty("connectTimeout", "3");
        settings.setProperty("socketTimeout", "3");
        settings.setProperty("prepareThreshold", "1");
        settings.setProperty("preferQueryMode", "extended");
        return () -> DriverManager.getConnection(jdbcUrl, settings);
    }

    private static void validateEndpoint(GreptimeProperties properties, String jdbcUrl) {
        if (!jdbcUrl.startsWith("jdbc:postgresql://")) {
            throw new IllegalArgumentException("Repeated errors require PostgreSQL extended queries");
        }
        var endpoint = URI.create(jdbcUrl.substring("jdbc:".length()));
        if (endpoint.getUserInfo() != null || !Objects.equals(endpoint.getPath(), "/" + properties.database())) {
            throw new IllegalArgumentException("Repeated errors must use the configured external database and credentials");
        }
        if (endpoint.getRawQuery() == null) return;
        for (var parameter : endpoint.getRawQuery().split("&")) {
            var name = URLDecoder.decode(parameter.split("=", 2)[0], StandardCharsets.UTF_8).toLowerCase(java.util.Locale.ROOT);
            if (List.of("user", "password", "preferquerymode", "connecttimeout", "sockettimeout").contains(name)) {
                throw new IllegalArgumentException("Repeated error query credentials, binding and budgets cannot be overridden");
            }
        }
    }

    static String safeSummary(String body) {
        var text = body.replaceAll("[\\p{Cntrl}]+", " ")
                .replaceAll("(?i)(password|passwd|token|secret|authorization|api[-_]?key)(\\s*[:=]\\s*)(\"[^\"]*\"|'[^']*'|\\S+)", "$1$2[redacted]")
                .replaceAll("(?i)Bearer\\s+[A-Za-z0-9_.+/=-]+", "Bearer [redacted]");
        return text.length() <= 240 ? text : text.substring(0, 239) + "…";
    }

    private static LogRepeatedErrors.Records recordsState(String state, LogRepeatedErrors.Scope scope,
            LogRepeatedErrors.Selection selection) {
        return new LogRepeatedErrors.Records(state, scope, selection, List.of());
    }
}
