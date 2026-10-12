/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class TelemetryQueryRouteAuthorizationConfigTest {

    private static final String METRICS_GET_RULE =
            "  - /api/ingestion/otlp/metrics/console===get===[admin,user,guest]";
    private static final String LOGS_GET_RULE = "  - /api/logs/**===get===[admin,user,guest]";
    private static final String TRACES_GET_RULE = "  - /api/traces/**===get===[admin,user,guest]";
    private static final List<String> SURENESS_CONFIGS = List.of(
            "hertzbeat-startup/src/main/resources/sureness.yml",
            "hertzbeat-manager/src/test/resources/sureness.yml",
            "hertzbeat-e2e/hertzbeat-observability-e2e/src/test/resources/sureness.yml",
            "script/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-iotdb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-tdengine/conf/sureness.yml",
            "script/docker-compose/hertzbeat-mysql-victoria-metrics/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-greptimedb/conf/sureness.yml",
            "script/docker-compose/hertzbeat-postgresql-victoria-metrics/conf/sureness.yml");

    @Test
    void everyTelemetryQueryRequiresAnAuthenticatedReaderRole() {
        List<Executable> checks = new ArrayList<>();
        for (String config : SURENESS_CONFIGS) {
            checks.add(() -> assertRules(config));
        }
        assertAll(checks);
    }

    private static void assertRules(String config) throws IOException {
        List<String> lines = Files.readAllLines(repoRoot().resolve(config));
        assertTrue(lines.contains(METRICS_GET_RULE), () -> config + " must protect metrics queries");
        assertTrue(lines.contains(LOGS_GET_RULE), () -> config + " must protect historical log queries");
        assertTrue(lines.contains(TRACES_GET_RULE), () -> config + " must protect trace queries");
        assertFalse(lines.stream().anyMatch(line -> queryRoute(line) && line.endsWith("===*")),
                () -> config + " must not bypass telemetry query authentication");
    }

    private static boolean queryRoute(String line) {
        return line.contains("/api/ingestion/otlp/metrics/console")
                || line.contains("/api/logs/")
                || line.contains("/api/traces/");
    }

    private static Path repoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-manager/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate HertzBeat repository root");
        }
        return current;
    }
}
