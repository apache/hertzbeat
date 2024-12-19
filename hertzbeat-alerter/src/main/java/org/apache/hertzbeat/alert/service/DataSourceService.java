package org.apache.hertzbeat.alert.service;

import java.util.List;
import java.util.Map;

/**
 * datasource service
 */
public interface DataSourceService {
    
    /**
     * execute query
     * @param datasource datasource
     * @param query query
     * @return result
     */
    List<Map<String, Object>> query(String datasource, String query);
} 
