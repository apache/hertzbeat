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

package org.apache.hertzbeat.manager.instrumentation.intake;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Objects;
import org.springframework.stereotype.Component;

/** Strict canonical JSON boundary for safe intake advertisements. */
@Component
public class CollectorIntakeAdvertisementCodec {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true)
            .build();

    public CollectorIntakeAdvertisementRequest decode(String json) {
        if (json == null || json.isBlank()) {
            throw new CollectorIntakeAdvertisementException();
        }
        try {
            return MAPPER.readValue(json, CollectorIntakeAdvertisementRequest.class);
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new CollectorIntakeAdvertisementException();
        }
    }

    public String encode(CollectorIntakeAdvertisementRequest request) {
        try {
            return MAPPER.writeValueAsString(Objects.requireNonNull(request, "request"));
        } catch (JacksonException | IllegalArgumentException exception) {
            throw new CollectorIntakeAdvertisementException();
        }
    }
}
