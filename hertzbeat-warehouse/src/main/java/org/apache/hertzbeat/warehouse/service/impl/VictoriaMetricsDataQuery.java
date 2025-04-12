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

package org.apache.hertzbeat.warehouse.service.impl;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.service.DatasourceQueryService;
import org.apache.hertzbeat.warehouse.store.history.vm.PromQlQueryContent;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
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
 * tdengine data storage
 */
@Primary
@Component
@ConditionalOnProperty(prefix = "warehouse.store.victoria-metrics", name = "enabled", havingValue = "true")
@Slf4j
public class VictoriaMetricsDataQuery implements DatasourceQueryService {
    
    /**
     * <a href="https://docs.victoriametrics.com/Single-server-VictoriaMetrics.html#how-to-export-data-in-json-line-format">
     *     https://docs.victoriametrics.com/Single-server-VictoriaMetrics.html#how-to-export-data-in-json-line-format
     * </a>
     */
    private static final String QUERY_RANGE_PATH = "/api/v1/query_range";
    private static final String QUERY_PATH = "/api/v1/query";
    private static final String BASIC = "Basic";
    private static final String INNER_KEY_TIME = "__ts__";
    private static final String INNER_KEY_VALUE = "__value__";

    private final VictoriaMetricsProperties victoriaMetricsProp;

    private final RestTemplate restTemplate;

    public VictoriaMetricsDataQuery(VictoriaMetricsProperties victoriaMetricsProperties, RestTemplate restTemplate) {
        if (victoriaMetricsProperties == null) {
            log.error("init error, please config Warehouse victoriaMetrics props in application.yml");
            throw new IllegalArgumentException("please config Warehouse victoriaMetrics props");
        }
        this.restTemplate = restTemplate;
        victoriaMetricsProp = victoriaMetricsProperties;
    }

    @Override
    public List<DatasourceQueryData> query(List<DatasourceQuery> queries) {
        if (queries == null || queries.isEmpty()) {
            return List.of();
        }
        List<DatasourceQueryData> queryDataList = new LinkedList<>();
        for (DatasourceQuery query : queries) {
            DatasourceQueryData.DatasourceQueryDataBuilder queryDataBuilder = DatasourceQueryData.builder()
                    .refId(query.getRefId()).status(200);
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setAccept(List.of(MediaType.APPLICATION_JSON));
                if (StringUtils.hasText(victoriaMetricsProp.username())
                        && StringUtils.hasText(victoriaMetricsProp.password())) {
                    String authStr = victoriaMetricsProp.username() + ":" + victoriaMetricsProp.password();
                    String encodedAuth = new String(Base64.encodeBase64(authStr.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
                    headers.add(HttpHeaders.AUTHORIZATION,  BASIC + " " + encodedAuth);
                }
                HttpEntity<Void> httpEntity = new HttpEntity<>(headers);
                URI uri = UriComponentsBuilder.fromHttpUrl(victoriaMetricsProp.url() + QUERY_RANGE_PATH)
                        .queryParam(URLEncoder.encode("query", StandardCharsets.UTF_8), URLEncoder.encode(query.getExpr(), StandardCharsets.UTF_8))
                        .queryParam("start", query.getStart())
                        .queryParam("end", query.getEnd())
                        .queryParam("step", query.getStep())
                        .build(true).toUri();
                ResponseEntity<PromQlQueryContent> responseEntity = restTemplate.exchange(uri, HttpMethod.GET, httpEntity,
                        PromQlQueryContent.class);
                if (responseEntity.getStatusCode().is2xxSuccessful()) {
                    log.debug("query metrics data from victoria-metrics success. {}", uri);
                    if (responseEntity.getBody() != null && responseEntity.getBody().getData() != null
                            && responseEntity.getBody().getData().getResult() != null) {
                        List<PromQlQueryContent.ContentData.Content> contents = responseEntity.getBody().getData().getResult();
                        List<DatasourceQueryData.SchemaData> schemaDataList = new LinkedList<>();
                        for (PromQlQueryContent.ContentData.Content content : contents) {
                            DatasourceQueryData.MetricSchema.MetricSchemaBuilder schemaBuilder = DatasourceQueryData.MetricSchema
                                    .builder().fields(List.of(
                                            DatasourceQueryData.MetricField.builder().name(INNER_KEY_TIME)
                                                    .type("time").build(),
                                            DatasourceQueryData.MetricField.builder().name(INNER_KEY_VALUE)
                                                    .type("number").build()
                                    )).labels(content.getMetric());

                            List<Object[]> values = content.getValues();
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
            queryDataList.add(queryDataBuilder.build());
        }
        return queryDataList;
    }
}
