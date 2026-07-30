/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class ClusterAuthenticationPackagingTest {

    private static final String REQUIRED_SECRET =
            "CLUSTER_AUTH_ACTIVE_SECRET: ${CLUSTER_AUTH_ACTIVE_SECRET:?";

    private static final String REQUIRED_COMMON_SECRET =
            "COMMON_SECRET: ${COMMON_SECRET:?";

    @Test
    void everyDockerComposeDistributionRequiresAndDocumentsAnInstallSecret()
            throws IOException {
        Path repository = repositoryRoot();
        List<Path> distributions;
        try (var paths = Files.list(repository.resolve("script/docker-compose"))) {
            distributions = paths
                    .filter(Files::isDirectory)
                    .filter(path -> path.getFileName().toString().startsWith("hertzbeat-"))
                    .sorted()
                    .toList();
        }
        assertEquals(5, distributions.size());

        for (Path distribution : distributions) {
            assertTrue(
                    Files.readString(distribution.resolve("docker-compose.yaml"))
                            .contains(REQUIRED_SECRET),
                    distribution + " must fail Compose interpolation before an unset secret reaches HertzBeat");
            assertTrue(
                    Files.readString(distribution.resolve("docker-compose.yaml"))
                            .contains(REQUIRED_COMMON_SECRET),
                    distribution + " must require the shared Manager/Collector AES secret");
            String application = Files.readString(distribution.resolve("conf/application.yml"));
            assertTrue(application.contains("authentication:"));
            assertTrue(application.contains("active-secret: ${CLUSTER_AUTH_ACTIVE_SECRET:}"));
            assertTrue(application.contains("secret: ${COMMON_SECRET:}"));
            for (String readme : List.of("README.md", "README_CN.md")) {
                String instructions = Files.readString(distribution.resolve(readme));
                assertTrue(instructions.contains("openssl rand -hex 32"), distribution + "/" + readme);
                assertTrue(instructions.contains("openssl rand -hex 16"), distribution + "/" + readme);
                assertTrue(instructions.contains("CLUSTER_AUTH_ACTIVE_SECRET"), distribution + "/" + readme);
                assertTrue(instructions.contains("COMMON_SECRET"), distribution + "/" + readme);
            }
        }
    }

    @Test
    void packageAndUpgradeDocumentationCoverClusterSecretProvisioning() throws IOException {
        Path repository = repositoryRoot();
        for (String document : List.of(
                "README.md",
                "README_CN.md",
                "README_JP.md",
                "home/docs/start/docker-deploy.md",
                "home/docs/start/docker-compose-deploy.md",
                "home/docs/start/package-deploy.md",
                "home/docs/start/quickstart.md",
                "home/docs/start/upgrade.md",
                "home/docs/help/collector.md")) {
            String instructions = Files.readString(repository.resolve(document));
            assertTrue(instructions.contains("CLUSTER_AUTH_ACTIVE_SECRET"), document);
            assertTrue(instructions.contains("COMMON_SECRET"), document);
        }

        String upgrade = Files.readString(repository.resolve("home/docs/start/upgrade.md"));
        assertTrue(upgrade.contains("openssl rand -hex 32"));
        assertTrue(upgrade.contains("openssl rand -hex 16"));
        assertTrue(upgrade.contains("CLUSTER_AUTH_MODE=optional"));
        String collector = Files.readString(repository.resolve("home/docs/help/collector.md"));
        assertTrue(collector.contains("openssl rand -hex 32"));
        assertTrue(collector.contains("openssl rand -hex 16"));
    }

    private Path repositoryRoot() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            if (Files.isDirectory(current.resolve("script/docker-compose"))
                    && Files.isDirectory(current.resolve("hertzbeat-manager"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("Cannot locate the HertzBeat repository root");
    }
}
