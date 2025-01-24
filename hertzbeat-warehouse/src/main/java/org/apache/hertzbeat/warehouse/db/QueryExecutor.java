package org.apache.hertzbeat.warehouse.db;

import java.util.List;
import java.util.Map;

/**
 * query executor interface
 */
public interface QueryExecutor {
    
    List<Map<String, Object>> execute(String query);
    
    boolean support(String datasource);
}
