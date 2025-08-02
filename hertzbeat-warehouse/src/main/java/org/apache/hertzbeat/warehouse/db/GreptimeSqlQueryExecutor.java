package org.apache.hertzbeat.warehouse.db;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * query executor for GreptimeDB SQL
 */
@Slf4j
@Component("greptimeSqlQueryExecutor")
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSqlQueryExecutor extends SqlQueryExecutor {

    private static final String QUERY_PATH = "/v1/sql";
    private static final String DATASOURCE = "Greptime-sql";

    private final GreptimeProperties greptimeProperties;


    public GreptimeSqlQueryExecutor(GreptimeProperties greptimeProperties, RestTemplate restTemplate) {
        super(restTemplate, new SqlQueryExecutor.HttpSqlProperties(greptimeProperties.httpEndpoint() + QUERY_PATH,
                greptimeProperties.username(), greptimeProperties.password()));
        this.greptimeProperties = greptimeProperties;
    }

    @Override
    public List<Map<String, Object>> execute(String queryString) {
        List<Map<String, Object>> results = new LinkedList<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(greptimeProperties.username())
                    && StringUtils.hasText(greptimeProperties.password())) {
                String authStr = greptimeProperties.username() + ":" + greptimeProperties.password();
                String encodedAuth = Base64Util.encode(authStr);
                headers.add(HttpHeaders.AUTHORIZATION, NetworkConstants.BASIC + SignConstants.BLANK + encodedAuth);
            }

            String requestBody = "sql=" + queryString;
            HttpEntity<String> httpEntity = new HttpEntity<>(requestBody, headers);

            String url = greptimeProperties.httpEndpoint() + QUERY_PATH;
            if (StringUtils.hasText(greptimeProperties.database())) {
                url += "?db=" + greptimeProperties.database();
            }

            ResponseEntity<GreptimeSqlQueryContent> responseEntity = restTemplate.exchange(url,
                    HttpMethod.POST, httpEntity, GreptimeSqlQueryContent.class);

            if (responseEntity.getStatusCode().is2xxSuccessful()) {
                GreptimeSqlQueryContent responseBody = responseEntity.getBody();
                if (responseBody != null && responseBody.getCode() == 0
                        && responseBody.getOutput() != null && !responseBody.getOutput().isEmpty()) {

                    for (GreptimeSqlQueryContent.Output output : responseBody.getOutput()) {
                        if (output.getRecords() != null && output.getRecords().getRows() != null) {
                            GreptimeSqlQueryContent.Output.Records.Schema schema = output.getRecords().getSchema();
                            List<List<Object>> rows = output.getRecords().getRows();

                            for (List<Object> row : rows) {
                                Map<String, Object> rowMap = new HashMap<>();
                                if (schema != null && schema.getColumnSchemas() != null) {
                                    for (int i = 0; i < Math.min(schema.getColumnSchemas().size(), row.size()); i++) {
                                        String columnName = schema.getColumnSchemas().get(i).getName();
                                        Object value = row.get(i);
                                        rowMap.put(columnName, value);
                                    }
                                } else {
                                    for (int i = 0; i < row.size(); i++) {
                                        rowMap.put("col_" + i, row.get(i));
                                    }
                                }
                                results.add(rowMap);
                            }
                        }
                    }
                }
            } else {
                log.error("query metrics data from greptime failed. {}", responseEntity);
            }
        } catch (Exception e) {
            log.error("query metrics data from greptime error. {}", e.getMessage(), e);
        }
        return results;
    }

    @Override
    public String getDatasource() {
        return DATASOURCE;
    }
}
