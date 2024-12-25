package org.apache.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * datasource service
 */
@Service
@Slf4j
public class DataSourceServiceImpl implements DataSourceService {
    
    @Autowired(required = false)
    private Map<String, QueryExecutor> executors;
    
    @Override
    public List<Map<String, Object>> query(String datasource, String query) {
        QueryExecutor executor = executors.get(datasource);
        if (executor == null) {
            throw new IllegalArgumentException("Unsupported datasource: " + datasource);
        }
        return executor.execute(query);
    }

    /**
     * 
     */
    public interface QueryExecutor {
        List<Map<String, Object>> execute(String query);
    }
} 
