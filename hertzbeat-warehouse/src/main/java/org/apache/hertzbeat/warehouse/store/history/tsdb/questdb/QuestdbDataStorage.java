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

package org.apache.hertzbeat.warehouse.store.history.tsdb.questdb;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import com.google.common.collect.Maps;
import io.questdb.client.Sender;
import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.apache.http.ssl.SSLContexts;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * HistoryQuestdbDataStorage class
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.questdb", name = "enabled", havingValue = "true")
@Slf4j
public class QuestdbDataStorage extends AbstractHistoryDataStorage {

    private static final String QUERY_HISTORY_SQL = "SELECT timestamp AS ts, instance, %s AS value FROM \"%s\" WHERE timestamp >= %s ORDER BY timestamp DESC";

    private static final String QUERY_HISTORY_SQL_WITH_INSTANCE = "SELECT timestamp AS ts, instance, %s AS value FROM \"%s\" WHERE instance = '%s' AND timestamp >= %s ORDER BY timestamp DESC";

    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL =
            "SELECT timestamp AS ts, first(%s) AS origin, avg(%s) AS mean, max(%s) AS max, min(%s) AS min FROM \"%s\" WHERE instance = '%s' AND timestamp >= %s SAMPLE BY 4h";

    private static final String QUERY_INSTANCE_SQL = "SELECT DISTINCT instance FROM \"%s\"";

    private Sender sender;

    private OkHttpClient client;

    private String queryBaseUrl;

    private QuestdbProperties questdbProperties;

    public QuestdbDataStorage(QuestdbProperties questdbProperties) {
        this.questdbProperties = questdbProperties;
        this.initQuestDb(questdbProperties);
    }

    public void initQuestDb(QuestdbProperties questdbProperties) {
        String ilpAddress =  questdbProperties.url(); // e.g., "localhost:9009"
        this.sender = Sender.builder(Sender.Transport.HTTP)
                .address(ilpAddress)
                .httpUsernamePassword(questdbProperties.username(), questdbProperties.password())
                .build();

        // Parse host and set query base URL (assuming HTTP port is 9000)
        String[] parts = ilpAddress.split(":");
        String host = parts[0];
        String queryPort = "9000"; // Default QuestDB HTTP port
        this.queryBaseUrl = "http://" + host + ":" + queryPort + "/exec?query=";

        this.client = new OkHttpClient.Builder()
                .readTimeout(NetworkConstants.HttpClientConstants.READ_TIME_OUT, TimeUnit.SECONDS)
                .writeTimeout(NetworkConstants.HttpClientConstants.WRITE_TIME_OUT, TimeUnit.SECONDS)
                .connectTimeout(NetworkConstants.HttpClientConstants.CONNECT_TIME_OUT, TimeUnit.SECONDS)
                .connectionPool(new ConnectionPool(
                        NetworkConstants.HttpClientConstants.MAX_IDLE_CONNECTIONS,
                        NetworkConstants.HttpClientConstants.KEEP_ALIVE_TIMEOUT,
                        TimeUnit.SECONDS)
                ).sslSocketFactory(defaultSslSocketFactory(), defaultTrustManager())
                .hostnameVerifier(noopHostnameVerifier())
                .retryOnConnectionFailure(true)
                .build();

        this.serverAvailable = this.checkConnection();
    }

    private boolean checkConnection() {
        // Test query to check if server is available
        Map<String, Object> result = executeQuery("SELECT 1");
        return result != null && result.containsKey("dataset");
    }


    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS || metricsData.getValues().isEmpty()) {
            return;
        }
        String table = this.generateTable(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId());

        try {
            RowWrapper rowWrapper = metricsData.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                // Wrap the construction of each row in a try-catch block
                // to prevent one bad row from corrupting the sender's state.
                try {
                    // 1. Set the table for the new row.
                    sender.table(table);
                    // 2. Process and write all symbols FIRST.
                    Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);
                    rowWrapper.cellStream()
                            .filter(cell -> cell.getMetadataAsBoolean(MetricDataConstants.LABEL))
                            .forEach(cell -> labels.put(cell.getField().getName(), cell.getValue()));
                    if (!labels.isEmpty()) {
                        sender.symbol("instance", JsonUtil.toJson(labels));
                    } else {
                        sender.symbol("instance", metricsData.getApp()
                                + "_" + metricsData.getMetrics());
                    }

                    // 3. Now, process and write all other columns (fields).
                    rowWrapper.cellStream().forEach(cell -> {
                        if (CommonConstants.NULL_VALUE.equals(cell.getValue())) {
                            return;
                        }
                        String fieldName = cell.getField().getName();
                        String fieldValue = cell.getValue();
                        Byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);

                        if (type == CommonConstants.TYPE_NUMBER) {
                            sender.doubleColumn(fieldName, Double.parseDouble(fieldValue));
                        } else if (type == CommonConstants.TYPE_STRING) {
                            sender.stringColumn(fieldName, fieldValue);
                        }
                    });

                    // 4. Finally, set the timestamp to commit the row.
                    sender.atNow();

                } catch (Exception e) {
                    log.error("[warehouse questdb]--Could not process a row, cancelling it. Error: {}", e.getMessage());
                    // IMPORTANT: Cancel the partially built row to reset the sender's state.
                    sender.cancelRow();
                }
            }
            sender.flush();
        } catch (Exception e) {
            log.error("[warehouse questdb]--Error during batch save: {}", e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        String dateAdd = getDateAdd(history);
        String selectSql = label == null ? String.format(QUERY_HISTORY_SQL, metric, table, dateAdd)
                : String.format(QUERY_HISTORY_SQL_WITH_INSTANCE, metric, table, label.replace("'", "\\'"), dateAdd);
        Map<String, List<Value>> instanceValueMap = new HashMap<>(8);
        try {
            Map<String, Object> selectResult = executeQuery(selectSql);
            if (selectResult == null || !selectResult.containsKey("dataset")) {
                return instanceValueMap;
            }
            List<Map<String, String>> columns = (List<Map<String, String>>) selectResult.get("columns");
            List<List<Object>> dataset = (List<List<Object>>) selectResult.get("dataset");

            Map<String, Integer> colMap = new HashMap<>();
            for (int i = 0; i < columns.size(); i++) {
                colMap.put(columns.get(i).get("name"), i);
            }
            int tsIdx = colMap.get("ts");
            int instanceIdx = colMap.get("instance");
            int valueIdx = colMap.get("value");

            for (List<Object> row : dataset) {
                String tsStr = (String) row.get(tsIdx);
                long time = Instant.parse(tsStr).toEpochMilli();
                String instanceValue = row.get(instanceIdx) == null ? "" : (String) row.get(instanceIdx);
                Object valObj = row.get(valueIdx);
                String strValue = valObj == null ? null : this.parseDoubleValue(valObj.toString());
                if (strValue == null) {
                    continue;
                }
                List<Value> valueList = instanceValueMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                valueList.add(new Value(strValue, time));
            }
        } catch (Exception e) {
            log.error("select history metric data in questdb error, sql:{}, msg: {}", selectSql, e.getMessage());
        }
        return instanceValueMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        String dateAdd = getDateAdd(history);
        Map<String, List<Value>> instanceValueMap = new HashMap<>(8);
        Set<String> instances = new HashSet<>(8);
        if (label != null) {
            instances.add(label);
        }
        if (instances.isEmpty()) {
            // query the instance
            String queryInstanceSql = String.format(QUERY_INSTANCE_SQL, table);
            Map<String, Object> instanceQueryResult = executeQuery(queryInstanceSql);
            if (instanceQueryResult != null && instanceQueryResult.containsKey("dataset")) {
                List<List<Object>> dataset = (List<List<Object>>) instanceQueryResult.get("dataset");
                for (List<Object> row : dataset) {
                    if (!row.isEmpty() && row.get(0) != null) {
                        instances.add(row.get(0).toString());
                    }
                }
            }
        }

        try {
            if (instances.isEmpty()) {
                instances.add("");
            }
            for (String instanceValue : instances) {
                String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL, metric, metric, metric, metric, table, instanceValue.replace("'", "\\'"), dateAdd);
                Map<String, Object> selectResult = executeQuery(selectSql);
                if (selectResult == null || !selectResult.containsKey("dataset")) {
                    continue;
                }
                List<Map<String, String>> columns = (List<Map<String, String>>) selectResult.get("columns");
                List<List<Object>> dataset = (List<List<Object>>) selectResult.get("dataset");

                Map<String, Integer> colMap = new HashMap<>();
                for (int i = 0; i < columns.size(); i++) {
                    colMap.put(columns.get(i).get("name"), i);
                }
                int tsIdx = colMap.get("ts");
                int originIdx = colMap.get("origin");
                int meanIdx = colMap.get("mean");
                int maxIdx = colMap.get("max");
                int minIdx = colMap.get("min");

                for (List<Object> row : dataset) {
                    String tsStr = (String) row.get(tsIdx);
                    long time = Instant.parse(tsStr).toEpochMilli();
                    Value.ValueBuilder valueBuilder = Value.builder().time(time);

                    Object originObj = row.get(originIdx);
                    if (originObj != null) {
                        valueBuilder.origin(this.parseDoubleValue(originObj.toString()));
                    } else {
                        continue;
                    }
                    Object meanObj = row.get(meanIdx);
                    if (meanObj != null) {
                        valueBuilder.mean(this.parseDoubleValue(meanObj.toString()));
                    } else {
                        continue;
                    }
                    Object maxObj = row.get(maxIdx);
                    if (maxObj != null) {
                        valueBuilder.max(this.parseDoubleValue(maxObj.toString()));
                    } else {
                        continue;
                    }
                    Object minObj = row.get(minIdx);
                    if (minObj != null) {
                        valueBuilder.min(this.parseDoubleValue(minObj.toString()));
                    } else {
                        continue;
                    }
                    List<Value> valueList = instanceValueMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                    valueList.add(valueBuilder.build());
                }
            }
        } catch (Exception e) {
            log.error("select history interval metric data in questdb error, msg: {}", e.getMessage());
        }
        return instanceValueMap;
    }

    private Map<String, Object> executeQuery(String sql) {
        try {
            String encodedSql = URLEncoder.encode(sql, StandardCharsets.UTF_8);
            String url = queryBaseUrl + encodedSql + "&timestamptype=rfc3339";
            String authHeader = "Basic " + Base64.getEncoder().encodeToString(
                    (questdbProperties.username() + ":" + questdbProperties.password())
                            .getBytes(StandardCharsets.UTF_8)
            );
            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", authHeader)
                    .get()
                    .build();
            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.error("QuestDB query failed: {} - {}", response.code(), response.message());
                    return null;
                }
                String body = response.body().string();
                return JsonUtil.fromJson(body, Map.class);
            }
        } catch (Exception e) {
            log.error("Error executing QuestDB query: {} - {}", sql, e.getMessage());
            return null;
        }
    }

    private String getDateAdd(String history) {
        history = history.toLowerCase();
        char unitChar = history.charAt(history.length() - 1);
        int count = Integer.parseInt(history.substring(0, history.length() - 1));
        String unit;
        switch (unitChar) {
            case 'd': 
                unit = "d"; 
                break;
            case 'h': 
                unit = "h"; 
                break;
            case 'm': // minute
                unit = "m"; 
                break;
            case 's': 
                unit = "s"; 
                break;
            default: throw new IllegalArgumentException("Invalid history unit: " + unitChar);
        }
        return String.format("dateadd('%s', %d, now())", unit, -count);
    }

    private String generateTable(String app, String metrics, Long monitorId) {
        return app + "_" + metrics + "_" + monitorId;
    }

    private String parseDoubleValue(String value) {
        return (new BigDecimal(value)).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static X509TrustManager defaultTrustManager() {
        return new X509TrustManager() {
            @Override
            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }

            @Override
            public void checkClientTrusted(X509Certificate[] certs, String authType) {
            }

            @Override
            public void checkServerTrusted(X509Certificate[] certs, String authType) {
            }
        };
    }

    private static SSLSocketFactory defaultSslSocketFactory() {
        try {
            SSLContext sslContext = SSLContexts.createDefault();
            sslContext.init(null, new TrustManager[]{
                    defaultTrustManager()
            }, new SecureRandom());
            return sslContext.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static HostnameVerifier noopHostnameVerifier() {
        return (s, sslSession) -> true;
    }

    @Override
    public void destroy() throws Exception {
        if (this.sender != null) {
            this.sender.close();
        }
        if (this.client != null) {
            this.client.dispatcher().executorService().shutdown();
        }
    }
}