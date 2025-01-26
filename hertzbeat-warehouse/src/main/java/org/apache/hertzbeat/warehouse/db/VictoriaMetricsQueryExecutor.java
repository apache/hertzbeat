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

package org.apache.hertzbeat.warehouse.db;


import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.warehouse.store.history.vm.PromQlQueryContent;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * query executor for victor metrics
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.victoria-metrics", name = "enabled", havingValue = "true")
@Slf4j
public class VictoriaMetricsQueryExecutor implements QueryExecutor {

    private static final String QUERY_PATH = "/api/v1/query";
    
    private final VictoriaMetricsProperties victoriaMetricsProp;

    private final RestTemplate restTemplate;

    public VictoriaMetricsQueryExecutor(VictoriaMetricsProperties victoriaMetricsProp, RestTemplate restTemplate) {
        this.victoriaMetricsProp = victoriaMetricsProp;
        this.restTemplate = restTemplate;
    }

    @Override
    public List<Map<String, Object>> execute(String query) {
        // http run the promql query
        List<Map<String, Object>> results = new LinkedList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(victoriaMetricsProp.username())
                    && StringUtils.hasText(victoriaMetricsProp.password())) {
                String authStr = victoriaMetricsProp.username() + ":" + victoriaMetricsProp.password();
                String encodedAuth = Base64Util.encode(authStr);
                headers.add(HttpHeaders.AUTHORIZATION,  NetworkConstants.BASIC + SignConstants.BLANK + encodedAuth);
            }
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
            URI uri = UriComponentsBuilder.fromHttpUrl(victoriaMetricsProp.url() + QUERY_PATH)
                    .queryParam("query", URLEncoder.encode(query, StandardCharsets.UTF_8))
                    .build(true).toUri();
            ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri,
                    HttpMethod.GET, httpEntity, PromQlQueryContent.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                if (responseEntity.getBody() != null && responseEntity.getBody().getData() != null
                        && responseEntity.getBody().getData().getResult() != null) {
                    List<PromQlQueryContent.ContentData.Content> contents = responseEntity.getBody().getData().getResult();
                    for (PromQlQueryContent.ContentData.Content content : contents) {
                        Map<String, String> labels = content.getMetric();
                        Map<String, Object> queryResult = new HashMap<>(8);
                        queryResult.putAll(labels);
                        if (content.getValue() != null && content.getValue().length == 2) {
                            queryResult.put("__timestamp__", content.getValue()[0]);
                            queryResult.put("__value__", content.getValue()[1]);
                        } else if (content.getValues() != null && !content.getValues().isEmpty()) {
                            List<Object> values = new LinkedList<>();
                            for (Object[] valueArr : content.getValues()) {
                                values.add(valueArr[1]);
                            }
                            queryResult.put("__value__", values);
                        }
                        results.add(queryResult);
                    }
                }
            } else {
                log.error("query metrics data from victor-metrics failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error(e.toString(), e);
        }
        return results;
    }

    @Override
    public boolean support(String datasource) {
        return "promql".equals(datasource);
    }
}
