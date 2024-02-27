package org.dromara.hertzbeat.warehouse.store;

import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import org.apache.http.ssl.SSLContexts;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.influxdb.InfluxDB;
import org.influxdb.InfluxDBFactory;
import org.influxdb.dto.BatchPoints;
import org.influxdb.dto.Point;
import org.influxdb.dto.Query;
import org.influxdb.dto.QueryResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import javax.net.ssl.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * @author ceilzcx
 *
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.influxdb",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryInfluxdbDataStorage extends AbstractHistoryDataStorage {

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

    public HistoryInfluxdbDataStorage(WarehouseProperties properties) {
        this.initInfluxDb(properties);
    }

    public void initInfluxDb(WarehouseProperties properties) {
        OkHttpClient.Builder client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true);

        client.sslSocketFactory(defaultSslSocketFactory(), defaultTrustManager());
        client.hostnameVerifier(noopHostnameVerifier());

        WarehouseProperties.StoreProperties.InfluxdbProperties influxdbProperties = properties.getStore().getInfluxdb();
        this.influxDb = InfluxDBFactory.connect(influxdbProperties.getServerUrl(), influxdbProperties.getUsername(), influxdbProperties.getPassword(), client);
        // Close it if your application is terminating, or you are not using it anymore.
        Runtime.getRuntime().addShutdownHook(new Thread(influxDb::close));

        this.serverAvailable = this.createDatabase(influxdbProperties);
    }

    private boolean createDatabase(WarehouseProperties.StoreProperties.InfluxdbProperties influxdbProperties) {
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

        // 创建数据库
        String createDatabaseSql = String.format(CREATE_DATABASE, DATABASE);
        QueryResult createDatabaseResult = this.influxDb.query(new Query(createDatabaseSql));
        if (createDatabaseResult.hasError()) {
            log.error("create database {} in influxdb error, msg: {}", DATABASE, createDatabaseResult.getError());
            return false;
        }
        // 设置过期时间
        String createRetentionPolicySql = String.format(CREATE_RETENTION_POLICY, DATABASE, DATABASE,
                influxdbProperties.getExpireTime(), influxdbProperties.getReplication());
        QueryResult createRetentionPolicySqlResult = this.influxDb.query(new Query(createRetentionPolicySql));
        if (createRetentionPolicySqlResult.hasError()) {
            log.error("create retention policy in influxdb error, msg: {}", createDatabaseResult.getError());
            return false;
        }

        return true;
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse influxdb] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();

        String table = this.generateTable(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId());

        List<Point> points = new ArrayList<>();
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            Point.Builder builder = Point.measurement(table);
            builder.time(metricsData.getTime(), TimeUnit.MILLISECONDS);
            Map<String, String> labels = new HashMap<>(8);
            for (int i = 0; i < fieldsList.size(); i++) {
                CollectRep.Field field = fieldsList.get(i);
                if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                    if (field.getType() == CommonConstants.TYPE_NUMBER) {
                        builder.addField(field.getName(), Double.parseDouble(valueRow.getColumns(i)));
                    } else if (field.getType() == CommonConstants.TYPE_STRING) {
                        builder.addField(field.getName(), valueRow.getColumns(i));
                    }
                    if (field.getLabel()) {
                        labels.put(field.getName(), valueRow.getColumns(i));
                    }
                } else {
                    builder.addField(field.getName(), "");
                }
            }
            builder.tag("instance", JsonUtil.toJson(labels));
            points.add(builder.build());
        }
        BatchPoints.Builder builder = BatchPoints.database(DATABASE);
        builder.points(points);
        this.influxDb.write(builder.build());
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
                                valueBuilder.min(this.parseDoubleValue(value.get(3).toString()));
                            } else {
                                continue;
                            }
                            if (value.get(4) != null) {
                                valueBuilder.max(this.parseDoubleValue(value.get(4).toString()));
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
            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }

            public void checkClientTrusted(X509Certificate[] certs, String authType) {
            }

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
