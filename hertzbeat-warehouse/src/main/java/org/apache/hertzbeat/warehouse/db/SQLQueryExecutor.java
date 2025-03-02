package org.apache.hertzbeat.warehouse.db;

import java.util.List;
import java.util.Map;

import static org.apache.hertzbeat.warehouse.constants.WarehouseConstants.SQL;

public abstract class SQLQueryExecutor implements QueryExecutor {

    private final static String supportQueryLanguage = SQL;

    protected record ConnectorSQLProperties (
    ){};
    protected abstract List<Map<String, Object>> do_sql(Map<String, Object> params);

    public abstract List<Map<String, Object>> execute(String query);

    public abstract List<Map<String, Object>> query(String query, long time);

    public abstract List<Map<String, Object>> query_range(String query, long start, long end, String step);


    public boolean support(String datasource) {
        return supportQueryLanguage.equals(datasource);
    }

}
