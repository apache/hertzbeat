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

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class StartupDatabaseDriverPackagingTest {

    @Test
    void supportedManagedDatabaseDriversAreRuntimeDependencies() throws Exception {
        String pom = Files.readString(repositoryRoot().resolve("hertzbeat-startup/pom.xml"));

        for (String artifactId : List.of("mysql-connector-j", "postgresql")) {
            Pattern runtimeDependency = Pattern.compile("<dependency>\\s*<groupId>[^<]+</groupId>\\s*"
                    + "<artifactId>" + Pattern.quote(artifactId) + "</artifactId>\\s*"
                    + "<scope>runtime</scope>\\s*</dependency>");
            assertThat(runtimeDependency.matcher(pom).find())
                    .as(artifactId + " must be packaged for post-setup Spring contexts")
                    .isTrue();
        }
    }

    private static Path repositoryRoot() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null && !Files.exists(current.resolve("hertzbeat-startup/pom.xml"))) {
            current = current.getParent();
        }
        if (current == null) {
            throw new IllegalStateException("repository root not found");
        }
        return current;
    }
}
