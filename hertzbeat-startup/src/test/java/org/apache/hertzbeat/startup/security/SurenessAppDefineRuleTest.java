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
 * Guards the rbac rules covering the monitoring template routes under {@code /api/apps/**}.
 *
 * <p>Only the {@code get} verb used to be listed, and a verb without a rule carries no role
 * requirement at all, so `BaseProcessor.authorized` waved through any authenticated caller.
 * That let a {@code guest} account persist or delete the global collection templates that
 * {@code AppServiceImpl.applyMonitorDefineYml} writes, poisoning or disabling collection
 * for every monitor.
 */
class SurenessAppDefineRuleTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        try (InputStream in = SurenessAppDefineRuleTest.class.getResourceAsStream("/sureness.yml")) {
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

    @Test
    void writingMonitorTemplatesIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/apps/define/yml", "post"));
        assertEquals("[admin]", rolesFor("/api/apps/define/yml", "put"));
    }

    @Test
    void deletingMonitorTemplatesIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/apps/linux/define/yml", "delete"));
    }

    @Test
    void readingMonitorTemplatesStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/apps/linux/define/yml", "get"));
        assertEquals("[admin,user,guest]", rolesFor("/api/apps/linux/params", "get"));
    }
}
