package com.usthe.collector.collect.microservice.parse;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * http https collect
 *
 *
 */
@Slf4j
public class DefaultParseResponse implements AbstractParseResponse {
    @Override
    public void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                              CollectRep.MetricsData.Builder builder, Long responseTime) {
        JsonElement element = JsonParser.parseString(resp);
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        if (element.isJsonArray()) {
            JsonArray array = element.getAsJsonArray();
            for (JsonElement jsonElement : array) {
                if (jsonElement.isJsonObject()) {
                    JsonObject object = jsonElement.getAsJsonObject();
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    for (String alias : aliasFields) {
                        JsonElement valueElement = object.get(alias);
                        if (valueElement != null) {
                            String value = valueElement.toString();
                            valueRowBuilder.addColumns(value);
                        } else {
                            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                                valueRowBuilder.addColumns(responseTime.toString());
                            } else if (CollectorConstants.KEYWORD.equalsIgnoreCase(alias)) {
                                valueRowBuilder.addColumns(Integer.toString(keywordNum));
                            } else {
                                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                            }
                        }
                    }
                    builder.addValues(valueRowBuilder.build());
                }
            }
        } else if (element.isJsonObject()) {
            JsonObject object = element.getAsJsonObject();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                JsonElement valueElement = object.get(alias);
                if (valueElement != null) {
                    String value = valueElement.toString();
                    valueRowBuilder.addColumns(value);
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_DEFAULT,this);
    }
}
