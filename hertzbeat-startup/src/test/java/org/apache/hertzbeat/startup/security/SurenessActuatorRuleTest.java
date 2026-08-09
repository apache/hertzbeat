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

package org.apache.hertzbeat.startup.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import com.usthe.sureness.matcher.util.TirePathTree;
import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * Guards the rbac rule covering the spring boot actuator endpoints.
 *
 * <p>`application.yml` exposes `metrics`, `health` and `prometheus`, but `sureness.yml`
 * neither listed nor excluded `/actuator/**`. A route with no rule leaves `supportRoles`
 * null and `BaseProcessor.authorized` returns early, so every authenticated account
 * including {@code guest} could read jvm heap, thread and gc counters, http call
 * statistics and datasource health - useful for internal reconnaissance and as a
 * feedback channel while probing for resource exhaustion.
 */
class SurenessActuatorRuleTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    private static TirePathTree excludeTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        List<String> excludedResource;
        try (InputStream in = SurenessActuatorRuleTest.class.getResourceAsStream("/sureness.yml")) {
            assertNotNull(in, "sureness.yml must be on the classpath");
            Map<String, Object> document = new Yaml().load(in);
            resourceRole = (List<String>) document.get("resourceRole");
            excludedResource = (List<String>) document.get("excludedResource");
        }
        assertNotNull(resourceRole, "resourceRole must be present");
        assertNotNull(excludedResource, "excludedResource must be present");
        roleTree = new TirePathTree();
        roleTree.buildTree(new LinkedHashSet<>(resourceRole));
        excludeTree = new TirePathTree();
        excludeTree.buildTree(new LinkedHashSet<>(excludedResource));
    }

    @Test
    void actuatorEndpointsAreRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/actuator/prometheus" + SEPARATOR + "get"));
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/actuator/health" + SEPARATOR + "get"));
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/actuator/metrics" + SEPARATOR + "get"));
    }

    /**
     * Sureness evaluates the exclusion tree before any credential check, so an actuator
     * path landing there would hand these internals to anonymous callers instead.
     */
    @Test
    void actuatorEndpointsAreNotExcludedFromAuthentication() {
        assertNull(excludeTree.searchPathFilterRoles("/actuator/prometheus" + SEPARATOR + "get"));
        assertNull(excludeTree.searchPathFilterRoles("/actuator/health" + SEPARATOR + "get"));
    }
}
