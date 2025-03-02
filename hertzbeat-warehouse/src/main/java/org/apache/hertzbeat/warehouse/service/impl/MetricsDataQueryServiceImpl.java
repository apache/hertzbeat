package org.apache.hertzbeat.warehouse.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.MetricsDataQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class MetricsDataQueryServiceImpl implements MetricsDataQueryService {

    @Autowired
    List<QueryExecutor> executors;

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
            executor.query(query, time);
        }
        return null;
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
        for (String query : queries) {
            executor.query_range(query, start, end, step);
        }
        return null;
    }
}
