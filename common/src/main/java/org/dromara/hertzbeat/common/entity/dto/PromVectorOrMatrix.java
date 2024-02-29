package org.dromara.hertzbeat.common.entity.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.google.gson.JsonObject;
import lombok.*;
import lombok.experimental.Accessors;

import java.io.IOException;
import java.util.List;

/**
 * prometheus vector or matrix entity
 * @author myth
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
