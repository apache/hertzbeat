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

import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;

/** Fixed statement shapes; all scope values and exact message values are bound parameters. */
final class GreptimeRepeatedErrorSql {
    private static final String SERVICE = "COALESCE(service_name, '')";
    private static final String ENVIRONMENT = "COALESCE(json_get_string(resource_attributes, '$[\"deployment.environment.name\"]'), '')";
    private static final String FILTER = " FROM hertzbeat_logs WHERE hertzbeat_workspace_id = ?"
            + " AND timestamp >= CAST(? AS TIMESTAMP(9)) AND timestamp <= CAST(? AS TIMESTAMP(9))"
            + " AND severity_number BETWEEN 17 AND 20 AND body IS NOT NULL AND body <> ''";

    private GreptimeRepeatedErrorSql() { }

    record Bound(String sql, List<Object> parameters) {
        Bound { parameters = List.copyOf(parameters); }
    }

    static Bound groups(LogRepeatedErrors.Scope scope) {
        var predicate = predicate(scope);
        var rows = "SELECT " + SERVICE + " AS service_name, " + ENVIRONMENT + " AS environment, body,"
                + " timestamp, log_record_uid" + predicate.sql() + " LIMIT 10001";
        var sql = "WITH candidates AS (" + rows + "), population AS (SELECT COUNT(*) AS population_count,"
                + " MAX(LENGTH(body)) AS longest_message FROM candidates), ranked AS (SELECT service_name,"
                + " environment, body, COUNT(*) AS event_count, CAST(MAX(timestamp) AS BIGINT) / 1000000 AS last_seen,"
                + " MIN(log_record_uid) AS representative_uid FROM candidates"
                + " WHERE (SELECT population_count FROM population) <= 10000"
                + " AND (SELECT longest_message FROM population) <= 8192"
                + " GROUP BY service_name, environment, body HAVING COUNT(*) >= 2"
                + " ORDER BY event_count DESC, service_name ASC, environment ASC, body ASC LIMIT 3)"
                + " SELECT p.population_count, p.longest_message, r.service_name, r.environment, r.body,"
                + " r.event_count, r.last_seen, r.representative_uid FROM population p LEFT JOIN ranked r ON TRUE"
                + " ORDER BY r.event_count DESC, r.service_name ASC, r.environment ASC, r.body ASC";
        return new Bound(sql, predicate.parameters());
    }

    static Bound representative(LogRepeatedErrors.Scope scope, LogRepeatedErrors.Selection selection) {
        var predicate = predicate(scope);
        var parameters = new ArrayList<>(predicate.parameters());
        parameters.add(selection.representativeUid());
        return new Bound("SELECT " + SERVICE + " AS service_name, " + ENVIRONMENT + " AS environment, body"
                + predicate.sql() + " AND log_record_uid = ? LIMIT 2", parameters);
    }

    static Bound exactRecords(LogRepeatedErrors.Scope scope, String service, String environment, String message) {
        var predicate = predicate(scope);
        var parameters = new ArrayList<>(predicate.parameters());
        parameters.add(service);
        parameters.add(environment);
        parameters.add(message);
        return new Bound("SELECT log_record_uid, CAST(timestamp AS BIGINT) / 1000000 AS event_time"
                + predicate.sql() + " AND " + SERVICE + " = ? AND " + ENVIRONMENT + " = ? AND body = ?"
                + " ORDER BY timestamp DESC, log_record_uid DESC LIMIT 20", parameters);
    }

    private static Bound predicate(LogRepeatedErrors.Scope scope) {
        var sql = new StringBuilder(FILTER);
        var parameters = new ArrayList<Object>();
        parameters.add(scope.workspaceId());
        parameters.add(Math.multiplyExact(scope.start(), 1000000L));
        parameters.add(Math.multiplyExact(scope.end(), 1000000L));
        if (!scope.serviceName().isEmpty()) {
            sql.append(" AND ").append(SERVICE).append(" = ?");
            parameters.add(scope.serviceName());
        }
        if (!scope.environment().isEmpty()) {
            sql.append(" AND ").append(ENVIRONMENT).append(" = ?");
            parameters.add(scope.environment());
        }
        return new Bound(sql.toString(), parameters);
    }
}
