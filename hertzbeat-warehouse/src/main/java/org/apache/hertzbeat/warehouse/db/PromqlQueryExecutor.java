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
import org.apache.commons.codec.binary.Base64;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.INSTANT;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.PROMQL;
import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.RANGE;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.PromQlQueryContent;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * abstract class for promql query executor
 */
@Slf4j
public abstract class PromqlQueryExecutor implements QueryExecutor {

    private static final String supportQueryLanguage = PROMQL;
    private static final String QUERY_RANGE_PATH = "/api/v1/query_range";
    private static final String QUERY_PATH = "/api/v1/query";
    protected static final String HTTP_QUERY_PARAM = "query";
    protected static final String HTTP_TIME_PARAM = "time";
    protected static final String HTTP_START_PARAM = "start";
    protected static final String HTTP_END_PARAM = "end";
    protected static final String HTTP_STEP_PARAM = "step";
    private static final String INNER_KEY_TIME = "__ts__";
    private static final String INNER_KEY_VALUE = "__value__";

    private final RestTemplate restTemplate;

    private final HttpPromqlProperties httpPromqlProperties;

    PromqlQueryExecutor(RestTemplate restTemplate, HttpPromqlProperties httpPromqlProperties) {
        this.restTemplate = restTemplate;
        this.httpPromqlProperties = httpPromqlProperties;
    }

    /**
     * record class for promql http connection
     */
    protected record HttpPromqlProperties(
            String url,
            String username,
            String password
    ) {
    }

    @Override
    public List<Map<String, Object>> execute(String queryString) {
        List<Map<String, Object>> results = new LinkedList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(httpPromqlProperties.username())
                    && StringUtils.hasText(httpPromqlProperties.password())) {
                String authStr = httpPromqlProperties.username() + ":" + httpPromqlProperties.password();
                String encodedAuth = Base64Util.encode(authStr);
                headers.add(HttpHeaders.AUTHORIZATION, NetworkConstants.BASIC + SignConstants.BLANK + encodedAuth);
            }
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);

            UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder.fromUriString(httpPromqlProperties.url + QUERY_PATH);
            uriComponentsBuilder.queryParam(HTTP_QUERY_PARAM, queryString);
            URI uri = uriComponentsBuilder.build().toUri();
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

    @Override
    public DatasourceQueryData query(DatasourceQuery datasourceQuery) {
        DatasourceQueryData.DatasourceQueryDataBuilder queryDataBuilder = DatasourceQueryData.builder()
                .refId(datasourceQuery.getRefId()).status(200);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(httpPromqlProperties.username())
                    && StringUtils.hasText(httpPromqlProperties.password())) {
                String authStr = httpPromqlProperties.username() + ":" + httpPromqlProperties.password();
                String encodedAuth = new String(Base64.encodeBase64(authStr.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                headers.add(HttpHeaders.AUTHORIZATION, NetworkConstants.BASIC + " " + encodedAuth);
            }
            HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
            URI uri;
            if (datasourceQuery.getTimeType().equals(RANGE)) {
                uri = UriComponentsBuilder.fromUriString(httpPromqlProperties.url() + QUERY_RANGE_PATH)
                        .queryParam(HTTP_QUERY_PARAM, datasourceQuery.getExpr())
                        .queryParam(HTTP_START_PARAM, datasourceQuery.getStart())
                        .queryParam(HTTP_END_PARAM, datasourceQuery.getEnd())
                        .queryParam(HTTP_STEP_PARAM, datasourceQuery.getStep())
                        .build().toUri();
            } else if (datasourceQuery.getTimeType().equals(INSTANT)) {
                uri = UriComponentsBuilder.fromUriString(httpPromqlProperties.url() + QUERY_PATH)
                        .queryParam(HTTP_QUERY_PARAM, datasourceQuery.getExpr())
                        .build().toUri();
            } else {
                throw new IllegalArgumentException(String.format("no such time type for query id %s.", datasourceQuery.getRefId()));
            }
            ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri, HttpMethod.GET, httpEntity,
                    PromQlQueryContent.class);
            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                log.debug("query metrics data from promql http api success. {}", uri);
                if (responseEntity.getBody() != null && responseEntity.getBody().getData() != null
                        && responseEntity.getBody().getData().getResult() != null) {
                    List<PromQlQueryContent.ContentData.Content> contents = responseEntity.getBody().getData().getResult();
                    List<DatasourceQueryData.SchemaData> schemaDataList = new LinkedList<>();
                    for (PromQlQueryContent.ContentData.Content content : contents) {
                        DatasourceQueryData.MetricSchema.MetricSchemaBuilder schemaBuilder = DatasourceQueryData.MetricSchema
                                .builder().fields(List.of(
                                        // todo: unit?
                                        DatasourceQueryData.MetricField.builder().name(INNER_KEY_TIME)
                                                .type("time").build(),
                                        DatasourceQueryData.MetricField.builder().name(INNER_KEY_VALUE)
                                                .type("number").build()
                                )).labels(content.getMetric());
                        List<Object[]> values;
                        if (datasourceQuery.getTimeType().equals(RANGE)) {
                            values = content.getValues();
                        }
                        else {
                            values = List.<Object[]>of(content.getValue());
                        }
                        values.forEach(objects -> {
                            objects[0] = TimePeriodUtil.normalizeToMilliseconds(objects[0]);
                        });
                        DatasourceQueryData.SchemaData.SchemaDataBuilder schemaData = DatasourceQueryData.SchemaData.builder()
                                .schema(schemaBuilder.build()).data(values);
                        schemaDataList.add(schemaData.build());
                    }
                    queryDataBuilder.frames(schemaDataList);
                }
            } else {
                log.error("query metrics data from victoria-metrics failed. {}", responseEntity);
                queryDataBuilder.msg("query metrics data from victoria-metrics failed. ");
                queryDataBuilder.status(responseEntity.getStatusCode().value());
            }
        } catch (Exception e) {
            log.error("query metrics data from victoria-metrics error. {}.", e.getMessage(), e);
            queryDataBuilder.msg("query metrics data from victoria-metrics error: " + e.getMessage());
            queryDataBuilder.status(400);
        }
        return queryDataBuilder.build();
    }
    
    @Override
    public boolean support(String queryLanguage) {
        return StringUtils.hasText(queryLanguage) && queryLanguage.equalsIgnoreCase(supportQueryLanguage);
    }

}
