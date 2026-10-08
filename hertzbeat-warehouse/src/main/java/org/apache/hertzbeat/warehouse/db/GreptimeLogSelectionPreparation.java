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

package org.apache.hertzbeat.warehouse.db;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import org.springframework.util.StringUtils;

/** Bounded read-only capability proof for the unchanged managed 1.1.4 OTLP pipeline. */
final class GreptimeLogSelectionPreparation {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String PIPELINE = "hertzbeat_otlp_log_v1";

    private static final Pattern NUMBER = Pattern.compile("[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?");

    private static final List<String> PROBE = List.of("2", "2.0", "-0.0", "1e-8", "1e20", "1e309", "-1e309");

    private static final List<String> EXPECTED = List.of("2", "2.0", "-0.0", "1e-8", "1e20", "inf", "-inf");
    private final RestTemplate http;
    private final GreptimeProperties properties;
    private final Function<String, List<Map<String, Object>>> sql;
    private final long deadline;

    GreptimeLogSelectionPreparation(RestTemplate http, GreptimeProperties properties,
            Function<String, List<Map<String, Object>>> sql, long deadline) {
        this.http = http;
        this.properties = properties;
        this.sql = sql;
        this.deadline = deadline;
    }

    PreparedLogGroupSelection prepare(LogGroupSelection selection) {
        verifyPipeline();
        var candidates = new ArrayList<Candidate>();
        for (var key : selection.groups()) { candidates.add(candidate(key)); }
        var tokens = new ArrayList<>(PROBE);
        for (var candidate : candidates) {
            tokens.add(candidate.integer() == null ? "null" : candidate.integer().toString());
            tokens.add(candidate.decimal() == null ? "null" : numberToken(candidate.decimal()));
        }
        checkDeadline();
        var rows = sql.apply(projectionSql(tokens));
        checkDeadline();
        if (rows.size() != tokens.size()) { throw malformed(); }
        var projected = new ArrayList<String>();
        for (int i = 0; i < rows.size(); i++) {
            var row = rows.get(i);
            if (!(row.get("id") instanceof Number id) || id.longValue() != i || id.doubleValue() != i || !"1.1.4".equals(row.get("version"))) {
                if (row.get("version") instanceof String version && !"1.1.4".equals(version)) { throw unsupported(); }
                throw malformed();
            }
            Object value = row.get("value");
            if (value != null && !(value instanceof String)) { throw malformed(); }
            projected.add((String) value);
        }
        if (!projected.subList(0, PROBE.size()).equals(EXPECTED)) { throw unsupported(); }
        var service = serviceProjections(candidates);
        var targets = new ArrayList<PreparedLogGroupSelection.Target>();
        for (int i = 0; i < candidates.size(); i++) {
            var candidate = candidates.get(i);
            var key = selection.groups().get(i);
            String integer = projected.get(PROBE.size() + i * 2);
            String decimal = projected.get(PROBE.size() + i * 2 + 1);
            if (isService(key)) {
                integer = service.get(i * 2);
                decimal = service.get(i * 2 + 1);
            }
            targets.add(new PreparedLogGroupSelection.Target(key,
                    candidate.integer() != null && key.value().equals(integer) ? candidate.integer() : null,
                    candidate.decimal() != null && key.value().equals(decimal) ? Double.doubleToRawLongBits(candidate.decimal()) : null));
        }
        return new PreparedLogGroupSelection(selection, targets);
    }

    private void verifyPipeline() {
        JsonNode body = exchange("/v1/pipelines/" + PIPELINE, HttpMethod.GET, null);
        JsonNode pipelines = body.path("pipelines");
        if (!pipelines.isArray() || pipelines.isEmpty() || !pipelines.get(0).path("pipeline").isTextual()) { throw malformed(); }
        try {
            String expected = new ClassPathResource("greptime/pipelines/" + PIPELINE + ".yaml").getContentAsString(StandardCharsets.UTF_8);
            if (!normalize(expected).equals(normalize(pipelines.get(0).path("pipeline").textValue()))) { throw unsupported(); }
        } catch (IOException failure) { throw new IllegalStateException("Managed pipeline resource unavailable", failure); }
    }

    private Map<Integer, String> serviceProjections(List<Candidate> candidates) {
        var input = new ArrayList<Map<String, Object>>();
        var indices = new ArrayList<Integer>();
        var values = new java.util.HashMap<Integer, String>();
        for (int i = 0; i < candidates.size(); i++) {
            var candidate = candidates.get(i);
            if (!candidate.service()) { continue; }
            Number[] numbers = {candidate.integer(), candidate.decimal()};
            for (int j = 0; j < numbers.length; j++) {
                Number number = numbers[j];
                if (number == null) { continue; }
                if (!Double.isFinite(number.doubleValue())) {
                    // Pinned VRL Float -> string uses Rust Display; JSON cannot carry infinity in dry-run input.
                    values.put(i * 2 + j, number.doubleValue() > 0 ? "inf" : "-inf");
                    continue;
                }
                indices.add(i * 2 + j);
                input.add(Map.of("Timestamp", 1, "ObservedTimestamp", 1,
                        "ResourceAttributes", Map.of("service.name", number), "LogAttributes", Map.of(), "Body", ""));
            }
        }
        if (input.isEmpty()) { return values; }
        JsonNode response = exchange("/v1/pipelines/_dryrun?pipeline_name=" + PIPELINE, HttpMethod.POST, input);
        if (!response.isArray() || response.size() != 1 || !response.get(0).path("rows").isArray()
                || response.get(0).path("rows").size() != input.size()) { throw malformed(); }
        for (int i = 0; i < input.size(); i++) {
            JsonNode row = response.get(0).path("rows").get(i);
            String value = null;
            if (!row.isArray()) { throw malformed(); }
            for (JsonNode cell : row) {
                if ("service_name".equals(cell.path("key").asText())) {
                    if (value != null || !cell.path("value").isTextual() || !"STRING".equals(cell.path("data_type").asText())) { throw malformed(); }
                    value = cell.path("value").textValue();
                }
            }
            if (value == null) { throw malformed(); }
            values.put(indices.get(i), value);
        }
        return values;
    }

    private JsonNode exchange(String path, HttpMethod method, Object body) {
        checkDeadline();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String database = StringUtils.trimWhitespace(properties.database());
        headers.set("X-Greptime-DB-Name", StringUtils.hasText(database) ? database : "public");
        String username = StringUtils.trimWhitespace(properties.username());
        String password = StringUtils.trimWhitespace(properties.password());
        if (StringUtils.hasText(username) && StringUtils.hasText(password)) {
            headers.setBasicAuth(username, password, StandardCharsets.UTF_8);
        }
        var response = http.exchange(properties.httpEndpoint().replaceAll("/+$", "") + path,
                method, new HttpEntity<>(body, headers), String.class);
        checkDeadline();
        if (response == null || !response.getStatusCode().is2xxSuccessful() || response.getBody() == null) { throw malformed(); }
        try {
            return JSON.readTree(response.getBody());
        } catch (IOException failure) {
            throw new IllegalStateException("Malformed log preparation JSON", failure);
        }
    }

    private void checkDeadline() {
        if (Thread.currentThread().isInterrupted() || System.nanoTime() >= deadline) {
            throw new GreptimeQueryGuard.QueryTimeoutException("Log selection preparation deadline exceeded", null);
        }
    }


    private static Candidate candidate(LogGroupSelection.Key key) {
        Long integer = null;
        Double decimal = null;
        if ("value".equals(key.kind())) {
            String value = key.value();
            if (NUMBER.matcher(value).matches()) {
                try { integer = Long.valueOf(value); } catch (NumberFormatException ignored) { /* Not an OTLP Int64. */ }
                try {
                    double parsed = Double.parseDouble(value);
                    if (Double.isFinite(parsed)) { decimal = parsed; }
                } catch (NumberFormatException ignored) { /* String-only candidate. */ }
            } else if ("inf".equals(value) || "-inf".equals(value)) {
                decimal = "inf".equals(value) ? Double.POSITIVE_INFINITY : Double.NEGATIVE_INFINITY;
            }
        }
        return new Candidate(integer, decimal, isService(key));
    }


    private static boolean isService(LogGroupSelection.Key key) { return "builtin:serviceName".equals(key.field().id()); }

    private static String normalize(String value) { return value.replace("\r\n", "\n").strip(); }

    private static String numberToken(double value) {
        return Double.isInfinite(value) ? (value > 0 ? "1e309" : "-1e309") : Double.toString(value);
    }

    private static String projectionSql(List<String> tokens) {
        var values = new ArrayList<String>();
        for (int i = 0; i < tokens.size(); i++) { values.add("(" + i + ",'" + tokens.get(i) + "')"); }
        return "SELECT id, version() AS version, json_get_string(parse_json(concat('{\"v\":', token, '}')), '$[\"v\"]') AS value FROM (VALUES "
                + String.join(",", values) + ") AS fixture(id, token) ORDER BY id";
    }

    private static IllegalStateException malformed() { return new IllegalStateException("Malformed log projection response"); }

    private static UnsupportedOperationException unsupported() { return new UnsupportedOperationException("Unsupported live log projection"); }

    private record Candidate(Long integer, Double decimal, boolean service) { }
}
