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

package org.apache.hertzbeat.warehouse.store.history.influxdb;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
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
import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.AbstractHistoryDataStorage;
import org.apache.http.ssl.SSLContexts;
import org.influxdb.InfluxDB;
import org.influxdb.InfluxDBFactory;
import org.influxdb.dto.BatchPoints;
import org.influxdb.dto.Point;
import org.influxdb.dto.Query;
import org.influxdb.dto.QueryResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * HistoryInfluxdbDataStorage class
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.influxdb", name = "enabled", havingValue = "true")
@Slf4j
public class InfluxdbDataStorage extends AbstractHistoryDataStorage {

    private static final String DATABASE = "hertzbeat";

    private static final String SHOW_DATABASE = "SHOW DATABASES";

    private static final String CREATE_DATABASE = "CREATE DATABASE %s";

    private static final String QUERY_HISTORY_SQL = "SELECT instance, %s FROM %s WHERE time >= now() - %s order by time desc";

    private static final String QUERY_HISTORY_SQL_WITH_INSTANCE = "SELECT instance, %s FROM %s WHERE instance = '%s' and time >= now() - %s order by time desc";

    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL =
            "SELECT FIRST(%s), MEAN(%s), MAX(%s), MIN(%s) FROM %s WHERE instance = '%s' and time >= now() - %s GROUP BY time(4h)";

    private static final String CREATE_RETENTION_POLICY = "CREATE RETENTION POLICY \"%s_retention\" ON \"%s\" DURATION %s REPLICATION %d DEFAULT";

    private static final String QUERY_INSTANCE_SQL = "show tag values from %s with key = \"instance\"";

    private InfluxDB influxDb;

    public InfluxdbDataStorage(InfluxdbProperties influxdbProperties) {
        this.initInfluxDb(influxdbProperties);
    }

    public void initInfluxDb(InfluxdbProperties influxdbProperties) {

        var client = new OkHttpClient.Builder()
                .readTimeout(NetworkConstants.HttpClientConstants.READ_TIME_OUT, TimeUnit.SECONDS)
                .writeTimeout(NetworkConstants.HttpClientConstants.WRITE_TIME_OUT, TimeUnit.SECONDS)
                .connectTimeout(NetworkConstants.HttpClientConstants.CONNECT_TIME_OUT, TimeUnit.SECONDS)
                .connectionPool(new ConnectionPool(
                        NetworkConstants.HttpClientConstants.MAX_IDLE_CONNECTIONS,
                        NetworkConstants.HttpClientConstants.KEEP_ALIVE_TIMEOUT,
                        TimeUnit.SECONDS)
                ).sslSocketFactory(defaultSslSocketFactory(), defaultTrustManager())
                .hostnameVerifier(noopHostnameVerifier())
                .retryOnConnectionFailure(true);

        this.influxDb = InfluxDBFactory.connect(influxdbProperties.serverUrl(), influxdbProperties.username(), influxdbProperties.password(), client);
        // Close it if your application is terminating, or you are not using it anymore.
        Runtime.getRuntime().addShutdownHook(new Thread(influxDb::close));

        this.serverAvailable = this.createDatabase(influxdbProperties);
    }

    private boolean createDatabase(InfluxdbProperties influxdbProperties) {
        QueryResult queryResult = this.influxDb.query(new Query(SHOW_DATABASE));

        if (queryResult.hasError()) {
            log.error("show databases in influxdb error, msg: {}", queryResult.getError());
            return false;
        }

        for (QueryResult.Result result : queryResult.getResults()) {
            for (QueryResult.Series series : result.getSeries()) {
                for (List<Object> values : series.getValues()) {
                    if (values.contains(DATABASE)) {
                        // database exists
                        return true;
                    }
                }
            }
        }

        // create the database
        String createDatabaseSql = String.format(CREATE_DATABASE, DATABASE);
        QueryResult createDatabaseResult = this.influxDb.query(new Query(createDatabaseSql));
        if (createDatabaseResult.hasError()) {
            log.error("create database {} in influxdb error, msg: {}", DATABASE, createDatabaseResult.getError());
            return false;
        }
        // set the expiration time
        String createRetentionPolicySql = String.format(CREATE_RETENTION_POLICY, DATABASE, DATABASE,
                influxdbProperties.expireTime(), influxdbProperties.replication());
        QueryResult createRetentionPolicySqlResult = this.influxDb.query(new Query(createRetentionPolicySql));
        if (createRetentionPolicySqlResult.hasError()) {
            log.error("create retention policy in influxdb error, msg: {}", createDatabaseResult.getError());
            return false;
        }

        return true;
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValues().isEmpty()) {
            log.info("[warehouse influxdb] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }

        String table = this.generateTable(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId());
        List<Point> points = new ArrayList<>();
        
        try {
            RowWrapper rowWrapper = metricsData.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();
                Point.Builder builder = Point.measurement(table);
                builder.time(metricsData.getTime(), TimeUnit.MILLISECONDS);
                Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);

                rowWrapper.cellStream().forEach(cell -> {
                    if (CommonConstants.NULL_VALUE.equals(cell.getValue())) {
                        builder.addField(cell.getField().getName(), "");
                        return;
                    }

                    Byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);
                    if (type == CommonConstants.TYPE_NUMBER) {
                        builder.addField(cell.getField().getName(), Double.parseDouble(cell.getValue()));
                    } else if (type == CommonConstants.TYPE_STRING) {
                        builder.addField(cell.getField().getName(), cell.getValue());
                    }

                    if (cell.getMetadataAsBoolean(MetricDataConstants.LABEL)) {
                        labels.put(cell.getField().getName(), cell.getValue());
                    }
                });
                builder.tag("instance", JsonUtil.toJson(labels));
                points.add(builder.build());
            }

            BatchPoints.Builder builder = BatchPoints.database(DATABASE);
            builder.points(points);
            this.influxDb.write(builder.build());
        } catch (Exception e) {
            log.error("[warehouse influxdb]--Error: {}", e.getMessage(), e);
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        String selectSql = label == null ? String.format(QUERY_HISTORY_SQL, metric, table, history)
                : String.format(QUERY_HISTORY_SQL_WITH_INSTANCE, metric, table, label, history);
        Map<String, List<Value>> instanceValueMap = new HashMap<>(8);
        try {
            QueryResult selectResult = this.influxDb.query(new Query(selectSql, DATABASE), TimeUnit.MILLISECONDS);
            for (QueryResult.Result result : selectResult.getResults()) {
                if (result.getSeries() == null) {
                    continue;
                }
                for (QueryResult.Series series : result.getSeries()) {
                    for (List<Object> value : series.getValues()) {
                        long time = this.parseTimeToMillis(value.get(0));
                        String instanceValue = value.get(1) == null ? "" : String.valueOf(value.get(1));
                        String strValue = value.get(2) == null ? null : this.parseDoubleValue(value.get(2).toString());
                        if (strValue == null) {
                            continue;
                        }
                        List<Value> valueList = instanceValueMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                        valueList.add(new Value(strValue, time));
                    }
                }
            }
        } catch (Exception e) {
            log.error("select history metric data in influxdb error, sql:{}, msg: {}", selectSql, e.getMessage());
        }
        return instanceValueMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String label, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        Map<String, List<Value>> instanceValueMap = new HashMap<>(8);
        Set<String> instances = new HashSet<>(8);
        if (label != null) {
            instances.add(label);
        }
        if (instances.isEmpty()) {
            // query the instance near 1week
            String queryInstanceSql = String.format(QUERY_INSTANCE_SQL, table);
            QueryResult instanceQueryResult = this.influxDb.query(new Query(queryInstanceSql, DATABASE), TimeUnit.MILLISECONDS);
            for (QueryResult.Result result : instanceQueryResult.getResults()) {
                if (result.getSeries() == null) {
                    continue;
                }
                for (QueryResult.Series series : result.getSeries()) {
                    for (List<Object> value : series.getValues()) {
                        if (value != null && value.get(1) != null) {
                            instances.add(value.get(1).toString());
                        }
                    }
                }
            }
        }

        try {
            history = history.toLowerCase();
            if (instances.isEmpty()) {
                instances.add("");
            }
            for (String instanceValue : instances) {
                String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL, metric, metric, metric, metric, table, instanceValue, history);
                QueryResult selectResult = this.influxDb.query(new Query(selectSql, DATABASE), TimeUnit.MILLISECONDS);
                for (QueryResult.Result result : selectResult.getResults()) {
                    if (result.getSeries() == null) {
                        continue;
                    }
                    for (QueryResult.Series series : result.getSeries()) {
                        for (List<Object> value : series.getValues()) {
                            Value.ValueBuilder valueBuilder = Value.builder();
                            long time = this.parseTimeToMillis(value.get(0));
                            valueBuilder.time(time);
                            
                            if (value.get(1) != null) {
                                valueBuilder.origin(this.parseDoubleValue(value.get(1).toString()));
                            } else {
                                continue;
                            }
                            if (value.get(2) != null) {
                                valueBuilder.mean(this.parseDoubleValue(value.get(2).toString()));
                            } else {
                                continue;
                            }
                            if (value.get(3) != null) {
                                valueBuilder.max(this.parseDoubleValue(value.get(3).toString()));
                            } else {
                                continue;
                            }
                            if (value.get(4) != null) {
                                valueBuilder.min(this.parseDoubleValue(value.get(4).toString()));
                            } else {
                                continue;
                            }
                            List<Value> valueList = instanceValueMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                            valueList.add(valueBuilder.build());
                        }
                    }
                }
                List<Value> instanceValueList = instanceValueMap.get(instanceValue);
                if (instanceValueList == null || instanceValueList.isEmpty()) {
                    instanceValueMap.remove(instanceValue);
                }
            }
        } catch (Exception e) {
            log.error("select history interval metric data in influxdb error, msg: {}", e.getMessage());
        }
        return instanceValueMap;
    }

    private String generateTable(String app, String metrics, Long monitorId) {
        return app + "_" + metrics + "_" + monitorId;
    }

    private long parseTimeToMillis(Object time) {
        if (time == null) {
            return 0;
        }
        Double doubleTime = (Double) time;
        return doubleTime.longValue();
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
        if (this.influxDb != null) {
            this.influxDb.close();
        }
    }
}
