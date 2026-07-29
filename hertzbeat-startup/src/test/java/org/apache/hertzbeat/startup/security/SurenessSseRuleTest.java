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
 * Guards the rbac rules covering the server sent event streams.
 *
 * <p>`/api/alert/sse/**` and `/api/manager/sse/**` used to sit in `excludedResource`.
 * Sureness evaluates the exclusion tree before any credential check, so an anonymous
 * `curl -N` stayed subscribed and received every alert the deployment raised - internal
 * hostnames, addresses, metric values and alert content - because
 * `AlertNoticeDispatch` broadcasts each alert to every subscriber with no per subscriber
 * filtering. `/api/logs/sse/**` was already scoped this way; these now match it.
 */
class SurenessSseRuleTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    private static TirePathTree excludeTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        List<String> excludedResource;
        try (InputStream in = SurenessSseRuleTest.class.getResourceAsStream("/sureness.yml")) {
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
    void subscribingToAlertsRequiresAnAccount() {
        assertEquals("[admin,user,guest]",
                roleTree.searchPathFilterRoles("/api/alert/sse/subscribe" + SEPARATOR + "get"));
    }

    @Test
    void subscribingToManagerEventsRequiresAnAccount() {
        assertEquals("[admin,user,guest]",
                roleTree.searchPathFilterRoles("/api/manager/sse/subscribe" + SEPARATOR + "get"));
    }

    /**
     * The rule above only takes effect if the path stops matching an exclusion: sureness
     * returns from `checkIn` as soon as `isExcludedResource` matches, before any credential
     * is looked at.
     */
    @Test
    void theStreamsAreNoLongerAnonymous() {
        assertNull(excludeTree.searchPathFilterRoles("/api/alert/sse/subscribe" + SEPARATOR + "get"));
        assertNull(excludeTree.searchPathFilterRoles("/api/manager/sse/subscribe" + SEPARATOR + "get"));
    }

    @Test
    void theLogStreamScopingIsUnchanged() {
        assertEquals("[admin,user,guest]",
                roleTree.searchPathFilterRoles("/api/logs/sse/subscribe" + SEPARATOR + "get"));
    }
}
