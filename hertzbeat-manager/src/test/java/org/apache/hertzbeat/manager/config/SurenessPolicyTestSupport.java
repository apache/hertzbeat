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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.usthe.sureness.matcher.DefaultPathRoleMatcher;
import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.processor.exception.UnauthorizedException;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.subject.support.PasswordSubject;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.yaml.snakeyaml.Yaml;

/** Real policy matching and authorization only; subjects assume authentication with no credentials. */
final class SurenessPolicyTestSupport {
    private SurenessPolicyTestSupport() {
    }

    static boolean releaseProfile(String config) {
        return config.startsWith("script/") || config.equals("hertzbeat-startup/src/main/resources/sureness.yml");
    }

    @SuppressWarnings("unchecked")
    static DefaultPathRoleMatcher matcher(String config) throws Exception {
        Path root = Path.of("").toAbsolutePath();
        while (root != null && !Files.isRegularFile(root.resolve("mvnw"))) {
            root = root.getParent();
        }
        if (root == null) {
            throw new IllegalStateException("Cannot locate repository root");
        }
        Map<String, Object> policy = new Yaml().load(Files.readString(root.resolve(config)));
        DefaultPathRoleMatcher matcher = new DefaultPathRoleMatcher();
        matcher.setPathTreeProvider(new PathTreeProvider() {
            @Override
            public Set<String> providePathData() {
                return Set.copyOf((List<String>) policy.get("resourceRole"));
            }

            @Override
            public Set<String> provideExcludedResource() {
                return Set.copyOf((List<String>) policy.get("excludedResource"));
            }
        });
        matcher.buildTree();
        return matcher;
    }

    static void assertPolicy(DefaultPathRoleMatcher matcher, String config,
            String path, String method, String expectedRoles) {
        List<String> expected = expectedRoles == null ? null
                : Arrays.asList(expectedRoles.substring(1, expectedRoles.length() - 1).split(","));
        String resource = path + "===" + method;
        for (String role : List.of("admin", "user", "guest", "unrecognized")) {
            PasswordSubject subject = PasswordSubject.builder("already-authenticated-fixture", null)
                    .setTargetResource(resource).setOwnRoles(List.of(role)).build();
            String context = config + " " + resource + " role=" + role;
            assertFalse(matcher.isExcludedResource(subject), context);
            matcher.matchRole(subject);
            assertEquals(expected, subject.getSupportRoles(), context);
            if (expected == null || expected.contains(role)) {
                assertDoesNotThrow(() -> new PasswordProcessor().authorized(subject), context);
            } else {
                assertThrows(UnauthorizedException.class, () -> new PasswordProcessor().authorized(subject), context);
            }
        }
    }
}
