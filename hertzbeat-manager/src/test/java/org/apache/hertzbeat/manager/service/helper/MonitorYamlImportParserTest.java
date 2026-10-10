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

package org.apache.hertzbeat.manager.service.helper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link MonitorYamlImportParser}.
 */
class MonitorYamlImportParserTest {

    private static final String INVALID_YAML_MESSAGE = "Monitor YAML import content is invalid.";

    @Test
    void rejectsNonSequenceWithStableMessage() {
        assertInvalid("monitor: {name: website-prod}");
    }

    @Test
    void rejectsExcessiveRecordCountWithStableMessage() {
        assertInvalid("- monitor: {name: website-prod}\n  params: []\n".repeat(101));
    }

    @Test
    void rejectsExcessiveAliasesWithStableMessage() {
        String yamlContent = """
                - &shared
                  monitor: {name: website-prod}
                  params: []
                """ + "- *shared\n".repeat(51);

        assertInvalid(yamlContent);
    }

    @Test
    void rejectsExplicitJavaTypeTagsWithStableMessage() {
        assertInvalid("- !!java.util.Date {}");
    }

    @Test
    void rejectsExcessiveNestingWithStableMessage() {
        StringBuilder yamlContent = new StringBuilder("- root:\n");
        for (int depth = 0; depth < 51; depth++) {
            yamlContent.append("  ".repeat(depth + 1)).append("level").append(depth).append(":\n");
        }
        yamlContent.append("  ".repeat(52)).append("value\n");

        assertInvalid(yamlContent.toString());
    }

    @Test
    void rejectsExcessiveCodePointsWithStableMessage() {
        assertInvalid("- monitor:\n    description: " + "a".repeat(3 * 1024 * 1024 + 1));
    }

    private static void assertInvalid(String content) {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> MonitorYamlImportParser.parse(inputStream(content)));

        assertEquals(INVALID_YAML_MESSAGE, exception.getMessage());
    }

    private static InputStream inputStream(String content) {
        return new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
    }
}
