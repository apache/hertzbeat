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
 * Guards the rbac rules covering the generated openapi document.
 *
 * <p>These paths used to sit in {@code excludedResource}. Sureness checks the exclusion
 * tree before any credential check, so an anonymous request returned the full document:
 * every route, http method, parameter name and type, and every request and response
 * model. That is a ready made map of the attack surface, so it is scoped like any other
 * administrative resource.
 */
class SurenessOpenApiDocRuleTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    private static TirePathTree excludeTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        List<String> excludedResource;
        try (InputStream in = SurenessOpenApiDocRuleTest.class.getResourceAsStream("/sureness.yml")) {
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
    void theOpenApiDocumentIsRestrictedToAdmin() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/v3/api-docs" + SEPARATOR + "get"));
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/v2/api-docs" + SEPARATOR + "get"));
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/swagger-resources/configuration/ui" + SEPARATOR + "get"));
    }

    /**
     * springdoc also serves the grouped documents and its own config under the same
     * prefix; a rule bound to the bare path would leave those anonymous.
     */
    @Test
    void theGroupedDocumentsAreCoveredToo() {
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/v3/api-docs/swagger-config" + SEPARATOR + "get"));
        assertEquals("[admin]", roleTree.searchPathFilterRoles("/v3/api-docs/default" + SEPARATOR + "get"));
    }

    @Test
    void theOpenApiDocumentIsNoLongerAnonymous() {
        assertNull(excludeTree.searchPathFilterRoles("/v3/api-docs" + SEPARATOR + "get"));
        assertNull(excludeTree.searchPathFilterRoles("/v2/api-docs" + SEPARATOR + "get"));
        assertNull(excludeTree.searchPathFilterRoles("/swagger-resources/configuration/ui" + SEPARATOR + "get"));
    }
}
