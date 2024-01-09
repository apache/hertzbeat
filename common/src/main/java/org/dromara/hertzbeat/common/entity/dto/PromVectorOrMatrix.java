package org.dromara.hertzbeat.common.entity.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.google.gson.JsonObject;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.Accessors;

import java.io.IOException;
import java.util.List;

/**
 * @author myth
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Accessors(chain = true)
@ToString
public class PromVectorOrMatrix {
    private String status;
    private Data data;

    @lombok.Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Accessors(chain = true)
    @ToString
    public static class Data {
        String resultType;
        List<Result> result;
    }

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

    @lombok.Data
    @NoArgsConstructor
    @Accessors(chain = true)
    public static class MetricJsonObjectDeserializer extends JsonDeserializer<JsonObject>{

        @Override
        public JsonObject deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {
            ObjectCodec oc = jp.getCodec();
            JsonNode node = oc.readTree(jp);

            JsonObject metric = new JsonObject();
            node.fields().forEachRemaining(entry -> {
                metric.addProperty(entry.getKey(), entry.getValue().asText());
            });

            return metric;
        }
    }
}
