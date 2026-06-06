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

package org.apache.hertzbeat.startup;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class SpringAiStartupConfigurationTest {

    @Test
    void defaultStartupDisablesSpringAiChatAutoConfiguration() throws IOException {
        String applicationYaml = readRepoFile("hertzbeat-startup/src/main/resources/application.yml");
        String applicationTestYaml = readRepoFile("hertzbeat-startup/src/main/resources/application-test.yml");

        assertThat(applicationYaml)
                .contains("ai:")
                .contains("model:")
                .contains("chat: none");
        assertThat(applicationTestYaml)
                .contains("ai:")
                .contains("model:")
                .contains("chat: none");
    }

    private static String readRepoFile(String relativePath) throws IOException {
        Path repoRoot = repoRoot();
        return Files.readString(repoRoot.resolve(relativePath));
    }

    private static Path repoRoot() {
        Path userDir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        if (Files.exists(userDir.resolve("pom.xml"))
                && Files.exists(userDir.resolve("hertzbeat-startup/pom.xml"))) {
            return userDir;
        }
        return userDir.getParent();
    }
}
