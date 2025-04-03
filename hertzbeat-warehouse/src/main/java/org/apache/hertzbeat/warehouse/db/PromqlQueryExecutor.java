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

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.warehouse.store.history.vm.PromQlQueryContent;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.PROMQL;

@Slf4j
public abstract class PromqlQueryExecutor implements QueryExecutor {

    private final static String supportQueryLanguage = PROMQL;
    protected final static String HTTP_QUERY_PARAM = "query";
    protected final static String HTTP_TIME_PARAM = "time";
    protected final static String HTTP_START_PARAM = "start";
    protected final static String HTTP_END_PARAM = "end";
    protected final static String HTTP_STEP_PARAM = "step";

    private final RestTemplate restTemplate;

    private final HttpPromqlProperties httpPromqlProperties;

    PromqlQueryExecutor(RestTemplate restTemplate, HttpPromqlProperties httpPromqlProperties) {
        this.restTemplate = restTemplate;
        this.httpPromqlProperties = httpPromqlProperties;
    }

    protected record HttpPromqlProperties (
        String url,
        String username,
        String password
    ){};

    protected List<Map<String, Object>> http_promql(Map<String, Object> params) {
        // http run the promql query
        List<Map<String, Object>> results = new LinkedList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(httpPromqlProperties.username())
                    && StringUtils.hasText(httpPromqlProperties.password())) {
                String authStr = httpPromqlProperties.username() + ":" + httpPromqlProperties.password();
                String encodedAuth = Base64Util.encode(authStr);
                headers.add(HttpHeaders.AUTHORIZATION,  NetworkConstants.BASIC + SignConstants.BLANK + encodedAuth);
            }
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
            UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder.fromHttpUrl(httpPromqlProperties.url);
            for (Map.Entry<String, Object> entry : params.entrySet()) {
                uriComponentsBuilder.queryParam(entry.getKey(), entry.getValue());
            }
            URI uri = uriComponentsBuilder.build(true).toUri();
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
                log.error("query metrics data from greptime failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error(e.toString(), e);
        }
        return results;
    }

    public MetricQueryData convertToMetricQueryData(Object object) {
        MetricQueryData metricQueryData = new MetricQueryData();
        try {
            List<Map<String, Object>> metrics = (List<Map<String, Object>>) object;
            // todo
        } catch (Exception e) {
            log.error("converting to metric query data failed.");
        }
        return metricQueryData;
    }

    public List<Map<String, Object>> execute(String queryString) {
        Map<String, Object> params = new HashMap<>();
        params.put(HTTP_QUERY_PARAM, URLEncoder.encode(queryString, StandardCharsets.UTF_8));
        return http_promql(params);
    }

    public List<Map<String, Object>> query(String queryString, long time) {
        Map<String, Object> params = new HashMap<>();
        params.put(HTTP_QUERY_PARAM, URLEncoder.encode(queryString, StandardCharsets.UTF_8));
        params.put(HTTP_TIME_PARAM, time);
        return http_promql(params);
    }

    public List<Map<String, Object>> query_range(String queryString, long start, long end, String step) {
        Map<String, Object> params = new HashMap<>();
        params.put(HTTP_QUERY_PARAM, URLEncoder.encode(queryString, StandardCharsets.UTF_8));
        params.put(HTTP_START_PARAM, start);
        params.put(HTTP_END_PARAM, end);
        params.put(HTTP_STEP_PARAM, step);
        return http_promql(params);
    }

    public boolean support(String datasource) {
        return supportQueryLanguage.equals(datasource);
    }

}
