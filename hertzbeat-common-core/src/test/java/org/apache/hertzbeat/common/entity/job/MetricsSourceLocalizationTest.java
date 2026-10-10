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

package org.apache.hertzbeat.common.entity.job;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class MetricsSourceLocalizationTest {

    private static final Path PRODUCTION_SOURCE = Path.of(
            "src/main/java/org/apache/hertzbeat/common/entity/job/Metrics.java");
    private static final Pattern HAN_SCRIPT = Pattern.compile("\\p{Script=Han}");

    @Test
    void productionSourceShouldNotContainHanScriptLiterals() throws IOException {
        String source = Files.readString(PRODUCTION_SOURCE);

        assertFalse(HAN_SCRIPT.matcher(source).find(),
                () -> "source file must not contain Han-script literals: " + PRODUCTION_SOURCE);
    }
}
