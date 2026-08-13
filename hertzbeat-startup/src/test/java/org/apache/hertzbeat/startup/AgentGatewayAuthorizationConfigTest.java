/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.startup;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Authorization matrix for every shipped Agent Gateway route. */
class AgentGatewayAuthorizationConfigTest {

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

    private static final List<String> RULES = List.of(
            "  - /api/agent/model-providers/**===get===[admin]",
            "  - /api/agent/model-providers/**===post===[admin]",
            "  - /api/agent/model-providers/**===put===[admin]",
            "  - /api/agent/model-providers/**===delete===[admin]",
            "  - /api/agent/schedules/**===get===[admin]",
            "  - /api/agent/schedules/**===post===[admin]",
            "  - /api/agent/schedules/**===put===[admin]",
            "  - /api/agent/schedules/**===patch===[admin]",
            "  - /api/agent/schedules/**===delete===[admin]",
            "  - /api/agent/alert-analysis/**===get===[admin]",
            "  - /api/agent/sessions===get===[admin,user]",
            "  - /api/agent/sessions/**===get===[admin,user]",
            "  - /api/agent/webui/**===post===[admin,user]",
            "  - /api/agent/runs/**===post===[admin,user]",
            "  - /api/agent/approvals/**===post===[admin]",
            "  - /api/agent/interactions/**===post===[admin,user]");

    @Test
    void shippedConfigsUseTheExactAgentGatewayRoleMatrix() throws IOException {
        for (String config : SURENESS_CONFIGS) {
            List<String> lines = Files.readAllLines(repoRoot().resolve(config));
            List<String> agentRules = lines.stream()
                    .filter(line -> line.startsWith("  - /api/agent/"))
                    .toList();
            assertEquals(RULES, agentRules, config);
            assertFalse(lines.stream().anyMatch(line -> line.startsWith("  - /api/agent/**===")), config);
        }
    }

    private static Path repoRoot() {
        Path current = Paths.get("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-startup/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("Cannot locate HertzBeat repository root");
        }
        return current;
    }
}
