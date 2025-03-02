package org.apache.hertzbeat.warehouse.db;

import java.util.List;
import java.util.Map;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.SQL;

public abstract class SQLQueryExecutor implements QueryExecutor {

    private final static String supportQueryLanguage = SQL;

    public abstract List<Map<String, Object>> execute(String query);

    public boolean support(String datasource) {
        return supportQueryLanguage.equals(datasource);
    }

}
