/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.db;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class GreptimeSqlMutationResponseTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @ParameterizedTest
    @ValueSource(strings = {"{\"output\":[{\"affectedrows\":2}]}",
            "{\"code\":0,\"output\":[{\"affectedrows\":2}],\"execution_time_ms\":1}"})
    void actualMutationEnvelopeAcknowledgesSuccess(String json) throws Exception {
        assertEquals(2, mapper.readValue(json, GreptimeSqlMutationResponse.class).affectedRows());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"output\":[{\"affectedrows\":0}]}",
            "{\"code\":0,\"output\":[{\"affectedrows\":0}]}"})
    void zeroRowsAcknowledgesNoChange(String json) throws Exception {
        assertEquals(0, mapper.readValue(json, GreptimeSqlMutationResponse.class).affectedRows());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"output\":[]}", "{\"output\":[null]}",
            "{\"output\":[{\"records\":{}}]}", "{\"output\":[{\"affectedrows\":-1}]}",
            "{\"output\":[{\"affectedrows\":\"2\"}]}", "{\"output\":[{\"affectedrows\":1.5}]}",
            "{\"output\":[{\"affectedrows\":true}]}", "{\"output\":[{\"affectedrows\":9223372036854775808}]}",
            "{\"output\":[{\"affectedrows\":2},{\"affectedrows\":0}]}",
            "{\"output\":[{\"affectedrows\":2,\"records\":{}}]}",
            "{\"code\":1004,\"output\":[{\"affectedrows\":2}]}",
            "{\"code\":\"0\",\"output\":[{\"affectedrows\":2}]}",
            "{\"code\":0,\"error\":\"append mode\",\"output\":[{\"affectedrows\":2}]}",
            "{\"output\":[{\"affectedrows\":2,\"error\":\"failed\"}]}"})
    void malformedOrErrorPayloadCannotReportSuccess(String json) throws Exception {
        GreptimeSqlMutationResponse response = mapper.readValue(json, GreptimeSqlMutationResponse.class);
        assertThrows(IllegalStateException.class, response::affectedRows);
    }
}
