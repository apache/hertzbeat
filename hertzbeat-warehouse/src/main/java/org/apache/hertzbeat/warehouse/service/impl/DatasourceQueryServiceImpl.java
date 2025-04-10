package org.apache.hertzbeat.warehouse.service.impl;

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.entity.dto.query.MetricQueryData;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.DatasourceQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DatasourceQueryServiceImpl implements DatasourceQueryService {
    Map<String, QueryExecutor> executorMap;

    DatasourceQueryServiceImpl(List<QueryExecutor> executors) {
        executorMap = executors.stream().collect(Collectors.toMap(QueryExecutor::support, QueryExecutor -> QueryExecutor));
    }

    @Override
    public List<DatasourceQueryData> query(List<DatasourceQuery> queries) {
        if (queries == null) {
            throw new IllegalArgumentException("No query found");
        }
        List<DatasourceQueryData> datasourceQueryDataList = new ArrayList<>();
        for (DatasourceQuery datasourceQuery : queries) {
            QueryExecutor executor = executorMap.get(datasourceQuery.getDatasource());
            if (executor == null) {
                throw new IllegalArgumentException("Unsupported datasource: " + datasourceQuery.getDatasource());
            }
            datasourceQueryDataList.add(executor.query(datasourceQuery));
        }

        return datasourceQueryDataList;
    }
}
