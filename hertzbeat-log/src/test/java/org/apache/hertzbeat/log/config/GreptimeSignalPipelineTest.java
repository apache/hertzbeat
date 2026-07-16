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

package org.apache.hertzbeat.log.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class GreptimeSignalPipelineTest {

    @Test
    void shouldStoreOtlpBodyAsStringAndAttributesAsJson() throws Exception {
        String pipeline = new ClassPathResource("greptime/pipelines/hertzbeat_otlp_log_v1.yaml")
                .getContentAsString(StandardCharsets.UTF_8);

        assertThat(pipeline).contains("- field: body\n    type: string");
        assertThat(pipeline).doesNotContain("- body\n      - attributes");
        assertThat(pipeline).contains("- attributes\n      - resource\n      - instrumentation_scope\n    type: json");
    }
}
