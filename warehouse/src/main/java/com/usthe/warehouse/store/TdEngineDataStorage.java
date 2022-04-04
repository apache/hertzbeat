package com.usthe.warehouse.store;

import com.usthe.collector.dispatch.export.MetricsDataExporter;
import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * influxdb存储采集数据
 * @author tom
 * @date 2021/11/24 18:23
 */
@Configuration
@AutoConfigureAfter(value = {WarehouseProperties.class})
@ConditionalOnProperty(prefix = "warehouse.store.td-engine",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class TdEngineDataStorage implements DisposableBean {

    private HikariDataSource hikariDataSource;
    private WarehouseWorkerPool workerPool;
    private MetricsDataExporter dataExporter;
    private static final Pattern SQL_SPECIAL_STRING_PATTERN = Pattern.compile("(\\\\)|(')");
    private static final String INSERT_TABLE_DATA_SQL = "INSERT INTO %s USING %s TAGS (%s) VALUES %s";
    private static final String CREATE_SUPER_TABLE_SQL = "CREATE STABLE IF NOT EXISTS %s %s TAGS (monitor BIGINT)";
    private static final String NO_SUPER_TABLE_ERROR = "Table does not exist";
    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL
            = "SELECT ts, instance, %s FROM %s WHERE instance = %s AND ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_SQL
            = "SELECT ts, instance, %s FROM %s WHERE ts >= now - %s order by ts desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT first(%s), avg(%s), min(%s), max(%s) FROM %s WHERE instance = %s AND ts >= now - %s interval(4h)";
    private static final String QUERY_INSTANCE_SQL
            = "SELECT DISTINCT instance FROM %s WHERE ts >= now - 1w";

    public TdEngineDataStorage(WarehouseWorkerPool workerPool, WarehouseProperties properties,
                               MetricsDataExporter dataExporter) {
        this.workerPool = workerPool;
        this.dataExporter = dataExporter;
        if (properties == null || properties.getStore() == null || properties.getStore().getTdEngine() == null) {
            log.error("init error, please config Warehouse TdEngine props in application.yml");
            throw new IllegalArgumentException("please config Warehouse TdEngine props");
        }
        boolean success = initTdEngineDatasource(properties.getStore().getTdEngine());
        startStorageData(success);
    }

    private boolean initTdEngineDatasource(WarehouseProperties.StoreProperties.TdEngineProperties tdEngineProperties) {
        HikariConfig config = new HikariConfig();
        // jdbc properties
        config.setJdbcUrl(tdEngineProperties.getUrl());
        config.setUsername(tdEngineProperties.getUsername());
        config.setPassword(tdEngineProperties.getPassword());
        config.setDriverClassName(tdEngineProperties.getDriverClassName());
        //minimum number of idle connection
        config.setMinimumIdle(10);
        //maximum number of connection in the pool
        config.setMaximumPoolSize(10);
        //maximum wait milliseconds for get connection from pool
        config.setConnectionTimeout(30000);
        // maximum lifetime for each connection
        config.setMaxLifetime(0);
        // max idle time for recycle idle connection
        config.setIdleTimeout(0);
        //validation query
        config.setConnectionTestQuery("select server_status()");
        try {
            this.hikariDataSource =  new HikariDataSource(config);
        } catch (Exception e) {
            log.error("\n\t------------------WARN WARN WARN------------------\n" +
                    "\t---------------Init TdEngine Failed---------------\n" +
                    "\t---------------Init TdEngine Failed---------------\n" +
                    "\t--------------Please Config Tdengine--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n" +
                    "\t----------Can Not Use Metric History Now----------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return false;
        }
        return true;
    }

    private void startStorageData(boolean consume) {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-tdEngine-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataExporter.pollPersistentStorageMetricsData();
                    if (consume && metricsData != null) {
                        saveData(metricsData);
                    }
                } catch (InterruptedException e) {
                    log.error(e.getMessage());
                }
            }
        };
        workerPool.executeJob(runnable);
        workerPool.executeJob(runnable);
    }


    public void saveData(CollectRep.MetricsData metricsData) {
        if (metricsData == null || metricsData.getValuesList().isEmpty() || metricsData.getFieldsList().isEmpty()) {
            return;
        }
        String monitorId = String.valueOf(metricsData.getId());
        String superTable = metricsData.getApp() + "_" + metricsData.getMetrics() + "_super";
        String table = metricsData.getApp() + "_" + metricsData.getMetrics() + "_" + monitorId;
        //组建DATA SQL
        List<CollectRep.Field> fields = metricsData.getFieldsList();
        StringBuilder sqlBuffer = new StringBuilder();
        int i = 0;
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            StringBuilder sqlRowBuffer = new StringBuilder("(");
            sqlRowBuffer.append(metricsData.getTime() + i++).append(", ");
            sqlRowBuffer.append("'").append(valueRow.getInstance()).append("', ");
            for (int index = 0; index < fields.size(); index++) {
                CollectRep.Field field = fields.get(index);
                String value = valueRow.getColumns(index);
                if (field.getType() == CommonConstants.TYPE_NUMBER) {
                    // number data
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        sqlRowBuffer.append("NULL");
                    } else {
                        try {
                            double number = Double.parseDouble(value);
                            sqlRowBuffer.append(number);
                        } catch (Exception e) {
                            log.warn(e.getMessage());
                            sqlRowBuffer.append("NULL");
                        }
                    }
                } else {
                    // string
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        sqlRowBuffer.append("NULL");
                    } else {
                        sqlRowBuffer.append("'").append(formatStringValue(value)).append("'");
                    }
                }
                if (index != fields.size() - 1) {
                    sqlRowBuffer.append(", ");
                }
            }
            sqlRowBuffer.append(")");
            sqlBuffer.append(" ").append(sqlRowBuffer);
        }
        String insertDataSql = String.format(INSERT_TABLE_DATA_SQL, table, superTable, monitorId, sqlBuffer);
        log.debug(insertDataSql);
        Connection connection = null;
        Statement statement = null;
        try {
            connection = hikariDataSource.getConnection();
            statement = connection.createStatement();
            statement.execute(insertDataSql);
            connection.close();
        } catch (Exception e) {
            if (e.getMessage().contains(NO_SUPER_TABLE_ERROR)) {
                // 超级表未创建 创建对应超级表
                StringBuilder fieldSqlBuilder = new StringBuilder("(");
                fieldSqlBuilder.append("ts TIMESTAMP, ");
                fieldSqlBuilder.append("instance NCHAR(100), ");
                for (int index = 0; index < fields.size(); index++) {
                    CollectRep.Field field = fields.get(index);
                    String fieldName = field.getName();
                    if (field.getType() == CommonConstants.TYPE_NUMBER) {
                        fieldSqlBuilder.append(fieldName).append(" ").append("DOUBLE");
                    } else {
                        fieldSqlBuilder.append(fieldName).append(" ").append("NCHAR(100)");
                    }
                    if (index != fields.size() - 1) {
                        fieldSqlBuilder.append(", ");
                    }
                }
                fieldSqlBuilder.append(")");
                String createTableSql = String.format(CREATE_SUPER_TABLE_SQL, superTable, fieldSqlBuilder);
                try {
                    assert statement != null;
                    log.info("[tdengine-data]: create {} use sql: {}.", superTable, createTableSql);
                    statement.execute(createTableSql);
                    statement.execute(insertDataSql);
                } catch (Exception createTableException) {
                    log.error(e.getMessage(), createTableException);
                }
            } else {
                log.error(e.getMessage());
            }
        } finally {
            try {
                assert connection != null;
                connection.close();
            } catch (Exception e) {
                log.error(e.getMessage());
            }
        }
    }

    private String formatStringValue(String value){
        return SQL_SPECIAL_STRING_PATTERN.matcher(value).replaceAll("\\\\$0");
    }

    @Override
    public void destroy() throws Exception {
        if (hikariDataSource != null) {
            hikariDataSource.close();
        }
    }

    /**
     * 从TD ENGINE时序数据库获取指标历史数据
     *
     * @param monitorId 监控ID
     * @param app 监控类型
     * @param metrics 指标集合名
     * @param metric 指标名
     * @param instance 实例
     * @param history 历史范围
     * @return 指标历史数据列表
     */
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        String table = app + "_" + metrics + "_" + monitorId;
        String selectSql =  instance == null ? String.format(QUERY_HISTORY_SQL, metric, table, history) :
                String.format(QUERY_HISTORY_WITH_INSTANCE_SQL, metric, table, instance, history);
        log.debug(selectSql);
        Connection connection = null;
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        try {
            if (hikariDataSource == null) {
                log.error("\n\t---------------TdEngine Init Failed---------------\n" +
                        "\t--------------Please Config Tdengine--------------\n" +
                        "\t----------Can Not Use Metric History Now----------\n");
                return instanceValuesMap;
            }
            connection = hikariDataSource.getConnection();
            Statement statement = connection.createStatement();
            ResultSet resultSet = statement.executeQuery(selectSql);
            while (resultSet.next()) {
                Timestamp ts = resultSet.getTimestamp(1);
                String instanceValue = resultSet.getString(2);
                if (instanceValue == null || "".equals(instanceValue)) {
                    instanceValue = "NULL";
                }
                double value = resultSet.getDouble(3);
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                valueList.add(new Value(String.valueOf(value), ts.getTime()));
            }
            resultSet.close();
            return instanceValuesMap;
        } catch (SQLException sqlException) {
          log.warn(sqlException.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        } finally {
            try {
                assert connection != null;
                connection.close();
            } catch (Exception e) {
                log.error(e.getMessage());
            }
        }
        return instanceValuesMap;
    }

    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                    String metric, String instance, String history) {
        String table = app + "_" + metrics + "_" + monitorId;
        List<String> instances = new LinkedList<>();
        if (instance != null) {
            instances.add(instance);
        }
        if (instances.isEmpty()) {
            // 若未指定instance，需查询当前指标数据前1周有多少个instance
            String queryInstanceSql = String.format(QUERY_INSTANCE_SQL, table);
            Connection connection = null;
            try {
                connection = hikariDataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery(queryInstanceSql);
                while (resultSet.next()) {
                    String instanceValue = resultSet.getString(1);
                    if (instanceValue == null || "".equals(instanceValue)) {
                        instances.add("''");
                    } else {
                        instances.add(instanceValue);
                    }
                }
            } catch (Exception e) {
                log.error(e.getMessage());
            } finally {
                try {
                    assert connection != null;
                    connection.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(instances.size());
        for (String instanceValue : instances) {
            String selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                            metric, metric, metric, metric, table, instanceValue, history);
            log.debug(selectSql);
            if ("''".equals(instanceValue)) {
                instanceValue = "NULL";
            }
            List<Value> values = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
            Connection connection = null;
            try {
                connection = hikariDataSource.getConnection();
                Statement statement = connection.createStatement();
                ResultSet resultSet = statement.executeQuery(selectSql);
                while (resultSet.next()) {
                    Timestamp ts = resultSet.getTimestamp(1);
                    double origin = resultSet.getDouble(2);
                    double avg = resultSet.getDouble(3);
                    double min = resultSet.getDouble(4);
                    double max = resultSet.getDouble(5);
                    Value value = Value.builder()
                            .origin(String.valueOf(origin)).mean(String.valueOf(avg))
                            .min(String.valueOf(min)).max(String.valueOf(max))
                            .time(ts.getTime())
                            .build();
                    values.add(value);
                }
                resultSet.close();
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            } finally {
                try {
                    assert connection != null;
                    connection.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
        return instanceValuesMap;
    }
}
