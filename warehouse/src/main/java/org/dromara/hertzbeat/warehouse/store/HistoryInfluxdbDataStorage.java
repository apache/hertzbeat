package org.dromara.hertzbeat.warehouse.store;

import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.influxdb.InfluxDB;
import org.influxdb.InfluxDBFactory;
import org.influxdb.dto.BatchPoints;
import org.influxdb.dto.Point;
import org.influxdb.dto.Query;
import org.influxdb.dto.QueryResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * @author ceilzcx
 * @since 7/4/2023
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.influxdb",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryInfluxdbDataStorage extends AbstractHistoryDataStorage {

    private static final String DATABASE = "hertzbeat";

    private static final String SHOW_DATABASE = "SHOW DATABASES";

    private static final String CREATE_DATABASE = "CREATE DATABASE %s";

    // 时区可以通过添加: tz('Asia/Shanghai')处理, windows环境好像存在问题
    private static final String QUERY_HISTORY_SQL = "SELECT %s FROM %s WHERE time >= now() - %s order by time desc";

    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL =
            "SELECT FIRST(%s), MEAN(%s), MAX(%s), MIN(%s) FROM %s WHERE time >= now() - %s GROUP BY time(4h)";

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    private InfluxDB influxDB;

    public HistoryInfluxdbDataStorage(WarehouseProperties properties) {
        this.initInfluxDB(properties);
    }

    public void initInfluxDB(WarehouseProperties properties) {
        OkHttpClient.Builder client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .readTimeout(10, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true);

        WarehouseProperties.StoreProperties.InfluxdbProperties influxdbProperties = properties.getStore().getInfluxdb();
        this.influxDB = InfluxDBFactory.connect(influxdbProperties.getServerUrl(), influxdbProperties.getUsername(), influxdbProperties.getPassword(), client);

        // Close it if your application is terminating or you are not using it anymore.
        Runtime.getRuntime().addShutdownHook(new Thread(influxDB::close));

        this.serverAvailable = this.createDatabase();
    }

    private boolean createDatabase() {
        QueryResult queryResult = this.influxDB.query(new Query(SHOW_DATABASE));
        boolean isDatabaseExist = false;

        if (queryResult.hasError()) {
            log.error("show databases in influxdb error, msg: {}", queryResult.getError());
            return false;
        }

        for (QueryResult.Result result : queryResult.getResults()) {
            for (QueryResult.Series series : result.getSeries()) {
                for (List<Object> values : series.getValues()) {
                    if (values.contains(DATABASE)) {
                        isDatabaseExist = true;
                        break;
                    }
                }
            }
        }

        if (!isDatabaseExist) {
            // todo 设置过期时间
            String createDatabaseSql = String.format(CREATE_DATABASE, DATABASE);
            QueryResult createDatabaseResult = this.influxDB.query(new Query(createDatabaseSql));
            if (createDatabaseResult.hasError()) {
                log.error("create database {} in influxdb error, msg: {}", DATABASE, createDatabaseResult.getError());
                return false;
            }
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
            for (int i = 0; i < fieldsList.size(); i++) {
                if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                    if (fieldsList.get(i).getType() == CommonConstants.TYPE_NUMBER) {
                        builder.addField(fieldsList.get(i).getName(), Double.parseDouble(valueRow.getColumns(i)));
                    } else if (fieldsList.get(i).getType() == CommonConstants.TYPE_STRING) {
                        builder.addField(fieldsList.get(i).getName(), valueRow.getColumns(i));
                    }
                } else {
                    builder.addField(fieldsList.get(i).getName(), "");
                }
            }
            points.add(builder.build());
        }
        BatchPoints.Builder builder = BatchPoints.database(DATABASE);
        builder.points(points);
        this.influxDB.write(builder.build());
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        String selectSql = String.format(QUERY_HISTORY_SQL, metric, table, history);

        Map<String, List<Value>> instanceValueMap = new HashMap<>();
        String key = instance == null ? "" : instance;

        try {
            QueryResult selectResult = this.influxDB.query(new Query(selectSql, DATABASE));

            for (QueryResult.Result result : selectResult.getResults()) {
                if (result.getSeries() == null) {
                    continue;
                }
                for (QueryResult.Series series : result.getSeries()) {
                    for (List<Object> value : series.getValues()) {
                        String time = value.get(0).toString();
                        String strValue = this.parseDoubleValue(value.get(1).toString());
                        List<Value> valueList = instanceValueMap.computeIfAbsent(key, k -> new LinkedList<>());
                        valueList.add(new Value(strValue, this.parseTimeToMillis(time)));
                    }
                }
            }
        } catch (Exception e) {
            log.error("select history metric data in influxdb error, sql:{}, msg: {}", selectSql, e.getMessage());
        }
        return instanceValueMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        String table = this.generateTable(app, metrics, monitorId);
        String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL, metric, metric, metric, metric, table, history);

        Map<String, List<Value>> instanceValueMap = new HashMap<>();
        String key = instance == null ? "" : instance;

        try {
            QueryResult selectResult = this.influxDB.query(new Query(selectSql, DATABASE));

            for (QueryResult.Result result : selectResult.getResults()) {
                if (result.getSeries() == null) {
                    continue;
                }
                for (QueryResult.Series series : result.getSeries()) {
                    for (List<Object> value : series.getValues()) {
                        Value.ValueBuilder valueBuilder = Value.builder();

                        String time = value.get(0).toString();
                        valueBuilder.time(this.parseTimeToMillis(time));

                        if (value.get(1) != null) {
                            valueBuilder.origin(this.parseDoubleValue(value.get(1).toString()));
                        }
                        if (value.get(2) != null) {
                            valueBuilder.mean(this.parseDoubleValue(value.get(2).toString()));
                        }
                        if (value.get(3) != null) {
                            valueBuilder.min(this.parseDoubleValue(value.get(3).toString()));
                        }
                        if (value.get(4) != null) {
                            valueBuilder.max(this.parseDoubleValue(value.get(4).toString()));
                        }
                        List<Value> valueList = instanceValueMap.computeIfAbsent(key, k -> new LinkedList<>());
                        valueList.add(valueBuilder.build());
                    }
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

    private long parseTimeToMillis(String time) throws ParseException {
        // todo 存在时区的问题, 方法处理还是查询时能够处理?
        return dateFormat.parse(time).getTime();
    }

    private String parseDoubleValue(String value) {
        return (new BigDecimal(value)).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    @Override
    public void destroy() throws Exception {
        if (this.influxDB != null) {
            this.influxDB.close();
        }
    }
}
