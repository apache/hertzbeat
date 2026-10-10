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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class GreptimeSignalPipelineTest {

    @Test
    void pipelineResourceHasOneCanonicalClasspathDefinition() throws Exception {
        var resources = Thread.currentThread().getContextClassLoader()
                .getResources("greptime/pipelines/hertzbeat_otlp_log_v1.yaml");
        assertThat(Collections.list(resources)).hasSize(1);
    }

    @Test
    void precreatedTableMatchesTheCanonicalPipelineColumnsAndIndexes() throws Exception {
        String schema = new ClassPathResource("greptime/tables/hertzbeat_logs.sql")
                .getContentAsString(StandardCharsets.UTF_8);
        for (String name : new String[] {"trace_id", "span_id", "hertzbeat_event_id", "log_record_uid",
                "hertzbeat_ingest_id", "hertzbeat_entity_id", "hertzbeat_workspace_id"}) {
            assertThat(schema).contains("\"" + name + "\" STRING NULL SKIPPING INDEX");
        }
        assertThat(schema).contains("\"timestamp\" TIMESTAMP(9) TIME INDEX", "\"body\" STRING NULL FULLTEXT INDEX",
                "\"log_attributes\" JSON NULL", "\"resource_attributes\" JSON NULL", "PRIMARY KEY (\"service_name\")",
                "'append_mode' = 'true'");
        assertThat(schema).doesNotContain("\"time_unix_nano\"", "\"attributes\"", "\"resource\"");
    }

    @Test
    void shouldStoreOtlpBodyAsStringAndAttributesAsJson() throws Exception {
        String pipeline = new ClassPathResource("greptime/pipelines/hertzbeat_otlp_log_v1.yaml")
                .getContentAsString(StandardCharsets.UTF_8);

        assertThat(pipeline).contains("- field: body\n    type: string");
        assertThat(pipeline).doesNotContain("- body\n      - attributes");
        assertThat(pipeline).contains("- log_attributes\n      - resource_attributes\n    type: json");
    }
}
