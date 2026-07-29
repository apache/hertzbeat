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
 * Guards the routes that carried no rbac rule at all.
 *
 * <p>A route absent from {@code sureness.yml} leaves `supportRoles` null, and
 * `BaseProcessor.authorized` returns early when no role is required, so every one of
 * these was reachable by any authenticated account including {@code guest}: a raw promql
 * passthrough to the time series database, log deletion, log and alert injection, label
 * management and the internal queue metrics of the hertzbeat process.
 */
class SurenessUnruledEndpointTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        try (InputStream in = SurenessUnruledEndpointTest.class.getResourceAsStream("/sureness.yml")) {
            assertNotNull(in, "sureness.yml must be on the classpath");
            Map<String, Object> document = new Yaml().load(in);
            resourceRole = (List<String>) document.get("resourceRole");
        }
        assertNotNull(resourceRole, "resourceRole must be present");
        roleTree = new TirePathTree();
        roleTree.buildTree(new LinkedHashSet<>(resourceRole));
    }

    private static String rolesFor(String path, String method) {
        return roleTree.searchPathFilterRoles(path + SEPARATOR + method);
    }

    /**
     * `PromqlQueryExecutor` forwards the submitted expression verbatim, so this route reads
     * the whole metric store regardless of which monitors the caller may see.
     */
    @Test
    void queryingTheWarehouseDirectlyIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/warehouse/query", "post"));
    }

    @Test
    void probingStorageAvailabilityStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/warehouse/storage/status", "get"));
    }

    @Test
    void deletingLogsIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/logs", "delete"));
    }

    @Test
    void readingLogsStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/logs/list", "get"));
    }

    /**
     * Matches how the sibling ingestion routes `/api/otlp/**` and `/api/logs/ingest/**`
     * are already scoped, so a low privileged account can no longer forge log records.
     */
    @Test
    void ingestingOtlpLogsRequiresAtLeastUser() {
        assertEquals("[admin,user]", rolesFor("/api/logs/otlp/v1/logs", "post"));
    }

    /**
     * The prometheus alertmanager webhook injects alerts, which drive notifications.
     * Scoped like the sibling `/api/alerts/report` route.
     */
    @Test
    void injectingPrometheusAlertsRequiresAtLeastUser() {
        assertEquals("[admin,user]", rolesFor("/api/v2/alerts", "post"));
    }

    @Test
    void labelWritesFollowTheUsualScoping() {
        assertEquals("[admin,user,guest]", rolesFor("/api/label", "get"));
        assertEquals("[admin,user]", rolesFor("/api/label", "post"));
        assertEquals("[admin,user]", rolesFor("/api/label", "put"));
        assertEquals("[admin]", rolesFor("/api/label", "delete"));
    }

    @Test
    void processQueueMetricsAreRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/metrics", "get"));
    }

    /**
     * Favourites are stored per account and rendered on the monitor pages, so they stay
     * reachable by every role even though they sit under the same path prefix.
     */
    @Test
    void metricFavouritesStayOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/metrics/favorite/1", "get"));
        assertEquals("[admin,user,guest]", rolesFor("/api/metrics/favorite/1/cpu", "post"));
        assertEquals("[admin,user,guest]", rolesFor("/api/metrics/favorite/1/cpu", "delete"));
    }
}
