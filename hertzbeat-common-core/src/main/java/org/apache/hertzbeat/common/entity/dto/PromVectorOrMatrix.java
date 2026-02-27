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

package org.apache.hertzbeat.common.entity.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.Accessors;

/**
 * prometheus vector or matrix entity
 */
@lombok.Data
@AllArgsConstructor
@NoArgsConstructor
@Accessors(chain = true)
@ToString
@Getter
public class PromVectorOrMatrix {
    private String status;
    private Data data;

    /**
     * PromVectorOrMatrix.Data
     */
    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Accessors(chain = true)
    @ToString
    public static class Data {
        String resultType;
        List<Result> result;
    }

    /**
     * PromVectorOrMatrix.Result
     */
    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Accessors(chain = true)
    @ToString
    public static class Result {
        @JsonDeserialize(using = MetricJsonObjectDeserializer.class)
        JsonObject metric;
        List<Object> value;
        List<List<Object>> values;
    }

    /**
     * MetricJsonObjectDeserializer
     */
    @EqualsAndHashCode(callSuper = true)
    @lombok.Data
    @NoArgsConstructor
    @Accessors(chain = true)
    public static class MetricJsonObjectDeserializer extends JsonDeserializer<JsonObject>{

        @Override
        public JsonObject deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            ObjectCodec oc = jp.getCodec();
            JsonNode node = oc.readTree(jp);

            JsonObject metric = new JsonObject();
            node.fields().forEachRemaining(entry -> metric.addProperty(entry.getKey(), entry.getValue().asText()));

            return metric;
        }
    }
}
