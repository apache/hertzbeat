package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.session.Session;
import org.apache.iotdb.session.SessionDataSet;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.read.common.RowRecord;
import org.apache.iotdb.tsfile.write.record.Tablet;
import org.apache.iotdb.tsfile.write.schema.MeasurementSchema;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * IoTDB data storage
 *
 * @author ceilzcx
 * @since 2022/10/12
 */
@Configuration
@AutoConfigureAfter(value = {WarehouseProperties.class})
@ConditionalOnProperty(prefix = "warehouse.store.iotdb",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class IoTDBDataStorage extends AbstractDataStorage {
    // storage group (存储组)
    private static final String STORAGE_GROUP = "root.hertzbeat";

    private static final String SHOW_DEVICES
            = "SHOW DEVICES %s";
    // the second %s is alias
    private static final String QUERY_HISTORY_SQL
            = "SELECT %s as %s FROM %s WHERE Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT FIRST_VALUE(%s), AVG(%s), MIN_VALUE(%s), MAX_VALUE(%s) FROM %s GROUP BY ([now() - %s, now()), 4h) WITHOUT NULL ANY";

    private Session session;

    public IoTDBDataStorage(WarehouseWorkerPool workerPool,
                            WarehouseProperties properties,
                            CommonDataQueue commonDataQueue) {
        super(workerPool, properties, commonDataQueue);

        this.serverAvailable = this.initIoTDBSession(properties.getStore().getIotdb());
        this.startStorageData("warehouse-iotdb-data-storage", isServerAvailable());
    }

    private boolean initIoTDBSession(WarehouseProperties.StoreProperties.IoTDBProperties properties) {
        try {
            this.session = new Session.Builder()
                    .username(properties.getUsername())
                    .password(properties.getPassword())
                    .build();
            this.session.open();
        } catch (IoTDBConnectionException e) {
            log.warn("\n\t------------------WARN WARN WARN------------------\n" +
                    "\t-------------------Init IoTDB Failed-----------------\n" +
                    "\t------------------Please Config IoTDB----------------\n" +
                    "\t-----------Or Can Not Use Metric History Now---------\n");
            return false;
        }
        return true;
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        // tablet的deviceId添加引号会导致数据插入失败
        List<MeasurementSchema> schemaList = new ArrayList<>();

        // todo MeasurementSchema是在客户端生成的数据结构，编码和压缩没有作用
        // todo 需要使用指定的数据结构，还是需要手动创建timeseries或template
        List<CollectRep.Field> fieldsList = metricsData.getFieldsList();
        for (CollectRep.Field field : fieldsList) {
            MeasurementSchema schema = new MeasurementSchema();
            schema.setMeasurementId(field.getName());
            // handle field type
            if (field.getType() == CommonConstants.TYPE_NUMBER) {
                schema.setType(TSDataType.DOUBLE);
            } else if (field.getType() == CommonConstants.TYPE_STRING) {
                schema.setType(TSDataType.TEXT);
            }
            schemaList.add(schema);
        }
        Map<String, Tablet> tabletMap = new HashMap<>();
        try {
            long now = System.currentTimeMillis();
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                String instance = valueRow.getInstance();
                String deviceId = getDeviceId(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId(), instance, false);
                if (tabletMap.containsKey(instance)) {
                    // 避免Time重复
                    now++;
                } else {
                    tabletMap.put(instance, new Tablet(deviceId, schemaList));
                }
                Tablet tablet = tabletMap.get(instance);
                int rowIndex = tablet.rowSize++;
                tablet.addTimestamp(rowIndex, now);
                for (int i = 0; i < fieldsList.size(); i++) {
                    if (!CommonConstants.NULL_VALUE.equals(valueRow.getColumns(i))) {
                        if (fieldsList.get(i).getType() == CommonConstants.TYPE_NUMBER) {
                            tablet.addValue(fieldsList.get(i).getName(), rowIndex, Double.parseDouble(valueRow.getColumns(i)));
                        } else if (fieldsList.get(i).getType() == CommonConstants.TYPE_STRING) {
                            tablet.addValue(fieldsList.get(i).getName(), rowIndex, valueRow.getColumns(i));
                        }
                    }
                }
            }
            for (Tablet tablet : tabletMap.values()) {
                session.insertTablet(tablet, true);
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            e.printStackTrace();
        } finally {
            for (Tablet tablet : tabletMap.values()) {
                tablet.reset();
            }
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, instance, true);
        String selectSql;
        try {
            if (instance != null) {
                selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), addQuote(metric), deviceId, history);
                handleHistorySelect(selectSql, "", instanceValuesMap);
            } else {
                // 优先查询底下所有存在device, 如果存在底下所有device的数据, 否则查询deviceId的数据
                List<String> devices = queryAllDevices(deviceId);
                if (devices.isEmpty()) {
                    selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), addQuote(metric), deviceId, history);
                    handleHistorySelect(selectSql, "", instanceValuesMap);
                } else {
                    // todo 改造成一个select查询: select device1.metric, device2.metric from xxx
                    for (String device : devices) {
                        // 为什么不直接使用device？select有校验，device可能会报错(eg: xxx.xxx.xx-xx的形式)
                        String[] node = device.split("\\.");
                        String instanceId = node[node.length - 1];
                        selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), addQuote(metric), deviceId + "." + addQuote(instanceId), history);
                        handleHistorySelect(selectSql, instanceId, instanceValuesMap);
                    }
                }
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private void handleHistorySelect(String selectSql, String instanceId, Map<String, List<Value>> instanceValuesMap)
            throws IoTDBConnectionException, StatementExecutionException {
        SessionDataSet dataSet = this.session.executeQueryStatement(selectSql);
        log.debug("iot select sql: {}", selectSql);
        while (dataSet.hasNext()) {
            RowRecord record = dataSet.next();
            long timestamp = record.getTimestamp();
            double value = record.getFields().get(0).getDoubleV();
            String strValue = BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
            List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceId, k -> new LinkedList<>());
            valueList.add(new Value(strValue, timestamp));
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, instance, true);
        String selectSql;
        try {
            if (instance != null) {
                selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                        addQuote(metric), addQuote(metric), addQuote(metric), addQuote(metric), deviceId, history);
                handleHistoryIntervalSelect(selectSql, "", instanceValuesMap);
            } else {
                List<String> devices = queryAllDevices(deviceId);
                if (devices.isEmpty()) {
                    selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                            addQuote(metric), addQuote(metric), addQuote(metric), addQuote(metric), deviceId, history);
                    handleHistoryIntervalSelect(selectSql, "", instanceValuesMap);
                } else {
                    for (String device : devices) {
                        String[] node = device.split("\\.");
                        String instanceId = node[node.length - 1];
                        selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                                addQuote(metric), addQuote(metric), addQuote(metric), addQuote(metric), deviceId + "." + addQuote(instanceId), history);
                        handleHistoryIntervalSelect(selectSql, instanceId, instanceValuesMap);
                    }
                }
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private void handleHistoryIntervalSelect(String selectSql, String instanceId, Map<String, List<Value>> instanceValuesMap)
            throws IoTDBConnectionException, StatementExecutionException {
        SessionDataSet dataSet = this.session.executeQueryStatement(selectSql);
        log.debug("iot select sql: {}", selectSql);
        while (dataSet.hasNext()) {
            RowRecord record = dataSet.next();
            long timestamp = record.getTimestamp();
            double origin = record.getFields().get(0).getDoubleV();
            String originStr = BigDecimal.valueOf(origin).stripTrailingZeros().toPlainString();
            double avg = record.getFields().get(1).getDoubleV();
            String avgStr = BigDecimal.valueOf(avg).stripTrailingZeros().toPlainString();
            double min = record.getFields().get(2).getDoubleV();
            String minStr = BigDecimal.valueOf(min).stripTrailingZeros().toPlainString();
            double max = record.getFields().get(3).getDoubleV();
            String maxStr = BigDecimal.valueOf(max).stripTrailingZeros().toPlainString();
            Value value = Value.builder()
                    .origin(originStr).mean(avgStr)
                    .min(minStr).max(maxStr)
                    .time(timestamp)
                    .build();
            List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceId, k -> new LinkedList<>());
            valueList.add(value);
        }
    }

    /**
     * 获取deviceId下的所有设备
     *
     * @param deviceId 设备/实体
     */
    private List<String> queryAllDevices(String deviceId) throws IoTDBConnectionException, StatementExecutionException {
        String showDevicesSql = String.format(SHOW_DEVICES, deviceId + ".*");
        SessionDataSet dataSet = this.session.executeQueryStatement(showDevicesSql);
        List<String> devices = new ArrayList<>();
        while (dataSet.hasNext()) {
            RowRecord record = dataSet.next();
            devices.add(record.getFields().get(0).getStringValue());
        }
        return devices;
    }

    /**
     * 获取设备id
     * 有instanceId的使用 ${group}.${app}.${metrics}.${monitor}.${instanceId} 的方式
     * 否则使用 ${group}.${app}.${metrics}.${monitor} 的方式
     * 查询时可以通过 ${group}.${app}.${metrics}.${monitor}.* 的方式获取所有instance数据
     */
    private String getDeviceId(String app, String metrics, Long monitorId, String instanceId, boolean useQuote) {
        String deviceId = STORAGE_GROUP + "." +
                (useQuote ? addQuote(app) : app) + "." +
                (useQuote ? addQuote(metrics) : metrics) + "." +
                monitorId;
        if (instanceId != null && !instanceId.isEmpty() && !instanceId.equals(CommonConstants.NULL_VALUE)) {
            deviceId += "." + (useQuote ? addQuote(instanceId) : instanceId);
        }
        return deviceId;
    }

    // add quote，防止查询时关键字报错(eg: nodes)
    private String addQuote(String text) {
        return String.format("`%s`", text);
    }

    @Override
    public void destroy() throws Exception {
        if (this.session != null) {
            this.session.close();
        }
    }
}
