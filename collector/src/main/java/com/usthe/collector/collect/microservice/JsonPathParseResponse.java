package com.usthe.collector.collect.microservice;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.collector.util.JsonPathParser;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.job.protocol.ServiceProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.model.ServicePodModel;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.TypeRef;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;


/**
 *
 * @author myth
 * @date 2022/7/15 9:28
 */
@Slf4j
public class JsonPathParseResponse implements AbstractParseResponse {

    public static JsonPathParseResponse getInstance() {
        return JsonPathParseResponse.Singleton.INSTANCE;
    }

    @Override
    public void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                              CollectRep.MetricsData.Builder builder, Long responseTime) {
        TypeRef<List<Map<String,Object>>> typeRef = new TypeRef<List<Map<String,Object>>>() {};
        List<Map<String, Object>> results = JsonPathParser.parseContentWithJsonPath(resp, http.getParseScript(), typeRef);
        int keywordNum = CollectUtil.countMatchKeyword(resp, http.getKeyword());
        for (Map<String, Object> stringMap : results) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                Object value = stringMap.get(alias);
                if (value != null) {
                    valueRowBuilder.addColumns(String.valueOf(value));
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

    @Override
    public void parseK8sApi(Metrics metrics, Object resp, Map<String, ServicePodModel> podMap, List<String> aliasFields, ServiceProtocol service,
                            CollectRep.MetricsData.Builder builder, Long responseTime) {
        //解决乱序问题
        Configmap configmap = metrics.getChildParam().stream().filter(childParam -> {
            return "parseScript".equals(childParam.getKey());
        }).findFirst().get();
        List<String> parseScript = (List<String>)configmap.getValue();
        List<Map<String, Object>> results = JsonPathParser.parseContentWithJsonPath(GsonUtil.toJson(resp), service.getMetaData());
        for (Object stringMap : results) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            ServicePodModel model = new ServicePodModel();
            for (int i = 0; i < aliasFields.size(); i++) {
                String script = parseScript.get(i);
                String field = aliasFields.get(i);
                List<Map<String, Object>> list = null;
                Object value = null;
                String[] split = script.split("-->");
                switch (split[0]) {
                    case DispatchConstants.PARSE_SINGLE:
                        try {
                            list = JsonPathParser.parseContentWithJsonPath(GsonUtil.toJson(stringMap), split[1]);
                        } catch (Exception e) {
                            value = JsonPath.read(results, split[1]);
                        }
                        break;
                    case DispatchConstants.PARSE_GROUP:
                        try {
                            List<Map<String, Object>> maps = JsonPathParser.parseContentWithJsonPath(GsonUtil.toJson(results), split[1]);
                            value = maps.size();
                        } catch (Exception e) {
                            log.error("parse error！error detail:{}", e.getMessage());
                        }
                        break;
                }
                if (list != null && list.size() == 1) {
                    switch (field) {
                        case "podName":
                            model.setPodName(String.valueOf(list.get(0)));
                            break;
                        case "podHost":
                            model.setPodHost(String.valueOf(list.get(0)));
                            break;
                        case "podPort":
                            model.setPodPort(String.valueOf(list.get(0)));
                            break;
                        case "status":
                            model.setStatus(String.valueOf(list.get(0)));
                            break;
                    }
                    valueRowBuilder.addColumns(String.valueOf(list.get(0) == null ? CommonConstants.NULL_VALUE : list.get(0)));
                    model.getMetricsMap().put(field, String.valueOf(list.get(0) == null ? CommonConstants.NULL_VALUE : list.get(0)));
                } else {
                    valueRowBuilder.addColumns(String.valueOf(value == null ? CommonConstants.NULL_VALUE : value));
                    model.getMetricsMap().put(field, String.valueOf(value == null ? CommonConstants.NULL_VALUE : value));
                }
            }
            podMap.put(model.getPodName(), model);
            builder.addValues(valueRowBuilder.build());
        }
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_JSON_PATH, this);
    }

    private static class Singleton {
        private static final JsonPathParseResponse INSTANCE = new JsonPathParseResponse();
    }

}
