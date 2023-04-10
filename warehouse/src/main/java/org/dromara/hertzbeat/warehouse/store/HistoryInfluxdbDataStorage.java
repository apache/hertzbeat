package org.dromara.hertzbeat.warehouse.store;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Value;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonConstants;
import org.dromara.hertzbeat.warehouse.config.WarehouseProperties;
import org.influxdb.InfluxDB;
import org.influxdb.InfluxDBFactory;
import org.influxdb.dto.BatchPoints;
import org.influxdb.dto.Point;
import org.influxdb.dto.Query;
import org.influxdb.dto.QueryResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
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

    private static final String DATABASE = "database";

    private static final String SHOW_DATABASE = "SHOW DATABASES";

    private static final String CREATE_DATABASE = "CREATE DATABASE %s";

    private static final String USE_DATABASE = "USE %s";

    private InfluxDB influxDB;

    public HistoryInfluxdbDataStorage(WarehouseProperties properties) {
        this.initInfluxDB(properties);
    }

    public void initInfluxDB(WarehouseProperties properties) {
        WarehouseProperties.StoreProperties.InfluxdbProperties influxdbProperties = properties.getStore().getInfluxdb();
        this.influxDB = InfluxDBFactory.connect(influxdbProperties.getServerUrl(), influxdbProperties.getUsername(), influxdbProperties.getPassword());

        // Close it if your application is terminating or you are not using it anymore.
        Runtime.getRuntime().addShutdownHook(new Thread(influxDB::close));

        this.serverAvailable = this.createDatabase();
        if (this.serverAvailable) {
            this.serverAvailable = this.useDatabase();
        }
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

    private boolean useDatabase() {
        String useDatabaseSql = String.format(USE_DATABASE, DATABASE);
        QueryResult useDatabaseResult = this.influxDB.query(new Query(useDatabaseSql));
        if (useDatabaseResult.hasError()) {
            log.error("use database {} in influxdb error, msg: {}", DATABASE, useDatabaseResult.getError());
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

        String table = metricsData.getApp() + "_" + metricsData.getMetrics() + "_" + metricsData.getId();

        List<Point> points = new ArrayList<>();
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            Point.Builder builder = Point.measurement(table);
            builder.time(System.currentTimeMillis(), TimeUnit.MILLISECONDS);
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
        BatchPoints.Builder builder = BatchPoints.builder();
        builder.points(points);
        this.influxDB.write(builder.build());
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        return null;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        return null;
    }

    @Override
    public void destroy() throws Exception {
        if (this.influxDB != null) {
            this.influxDB.close();
        }
    }
}
