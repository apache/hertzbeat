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

package org.apache.hertzbeat.warehouse.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.MetricsDataQueryService;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MetricsDataQueryServiceImpl implements MetricsDataQueryService {
    List<QueryExecutor> executors;

    MetricsDataQueryServiceImpl() {
        executors = new ArrayList<>();
        ApplicationContext context = SpringContextHolder.getApplicationContext();
        Map<String, QueryExecutor> classes = context.getBeansOfType(QueryExecutor.class);
        classes.forEach((k, v) -> {
            executors.add(v);
        });
    }

    @Override
    public List<MetricQueryData> query(List<String> queries, String queryType, long time) {
        if (queries == null || executors.isEmpty()) {
            throw new IllegalArgumentException("No query executor found");
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(queryType)).findFirst().orElse(null);
        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + queryType);
        }
        List<MetricQueryData> metricQueryDataList = new ArrayList<>();
        for (String query : queries) {
            metricQueryDataList.add(executor.convertToMetricQueryData(executor.query(query, time)));
        }
        return metricQueryDataList;
    }

    @Override
    public List<MetricQueryData> queryRange(List<String> queries, String queryType, long start, long end, String step) {
        if (queries == null || executors.isEmpty()) {
            throw new IllegalArgumentException("No query executor found");
        }
        QueryExecutor executor = executors.stream().filter(e -> e.support(queryType)).findFirst().orElse(null);
        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + queryType);
        }
        List<MetricQueryData> metricQueryDataList = new ArrayList<>();
        for (String query : queries) {
            metricQueryDataList.add(executor.convertToMetricQueryData(executor.query_range(query, start, end, step)));
        }
        return metricQueryDataList;
    }
}
