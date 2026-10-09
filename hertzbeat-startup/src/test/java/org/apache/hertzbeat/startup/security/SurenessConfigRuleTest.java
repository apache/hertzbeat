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
 * Guards the rbac rules covering {@code /api/config/**}.
 *
 * <p>A route missing from {@code sureness.yml} carries no role requirement, and
 * {@code BaseProcessor.authorized} returns early when no role is required, so any
 * authenticated caller reaches it. The config routes used to be absent entirely, which
 * exposed {@code GET /api/config/secret} - the jwt signing key and the aes key that
 * protects stored monitor credentials - to every account including {@code guest}.
 */
class SurenessConfigRuleTest {

    private static final String SEPARATOR = "===";

    private static TirePathTree roleTree;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSurenessConfig() throws IOException {
        List<String> resourceRole;
        try (InputStream in = SurenessConfigRuleTest.class.getResourceAsStream("/sureness.yml")) {
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
    void readingTheSecretConfigIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/config/secret", "get"));
    }

    @Test
    void writingTheSecretConfigIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/config/secret", "post"));
    }

    @Test
    void writingAnyOtherConfigIsRestrictedToAdmin() {
        assertEquals("[admin]", rolesFor("/api/config/email", "post"));
        assertEquals("[admin]", rolesFor("/api/config/oss", "post"));
        assertEquals("[admin]", rolesFor("/api/config/template/linux", "put"));
    }

    /**
     * The notification widget in the top bar lets every signed in user flip the mute flag,
     * so this one write has to stay reachable by all roles.
     */
    @Test
    void togglingMuteStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/config/mute", "post"));
        assertEquals("[admin,user,guest]", rolesFor("/api/config/mute", "get"));
    }

    @Test
    void readingNonSecretConfigStaysOpenToEveryRole() {
        assertEquals("[admin,user,guest]", rolesFor("/api/config/system", "get"));
        assertEquals("[admin,user,guest]", rolesFor("/api/config/timezones", "get"));
    }
}
