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

package org.apache.hertzbeat.manager.service.impl;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class AppServiceStartupGuardSourceTest {

    @Test
    void jarAppDefineLoadingShouldSkipInvalidResourcesWithoutBlockingStartup() throws IOException {
        String source = Files.readString(Path.of("src/main/java/org/apache/hertzbeat/manager/service/impl/AppServiceImpl.java"));
        String jarStore = source.substring(source.indexOf("private class JarAppDefineStoreImpl"));

        assertTrue(jarStore.contains("app == null"),
                "Jar app define loading must skip null YAML documents from packaged resources.");
        assertTrue(jarStore.contains("StringUtils.isBlank(app.getApp())"),
                "Jar app define loading must skip app defines without an app key.");
        assertTrue(jarStore.contains("continue;"),
                "Invalid packaged app define resources should not abort the remaining valid resources.");
        assertTrue(jarStore.contains("RuntimeException"),
                "Malformed packaged app define resources should be isolated from startup.");
    }
}
