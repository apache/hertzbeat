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

package org.apache.hertzbeat.collector.runtime.otel;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OtelRuntimeConfigRendererTest {

    @TempDir
    private Path tempDir;

    @Test
    void rendersHostMetricsPipelineWithoutWritingSecrets() throws Exception {
        OtelRuntimeProperties properties = new OtelRuntimeProperties();
        properties.setHome(tempDir);
        properties.setConfig(tempDir.resolve("conf/runtime.yaml"));
        properties.setToken("secret-must-stay-in-environment");
        properties.setHealthPort(13247);

        Path config = new OtelRuntimeConfigRenderer().render(properties);
        String yaml = Files.readString(config);

        assertTrue(yaml.contains("hostmetrics:"));
        assertTrue(yaml.contains("processors: [memory_limiter, resource, batch]"));
        assertTrue(yaml.contains("endpoint: 127.0.0.1:13247"));
        assertTrue(yaml.contains("${env:HERTZBEAT_OTLP_TOKEN}"));
        assertFalse(yaml.contains(properties.getToken()));
    }
}
