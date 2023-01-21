package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.WarehouseWorkerPool;
import com.usthe.warehouse.config.WarehouseProperties;
import lombok.extern.slf4j.Slf4j;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.session.pool.SessionDataSetWrapper;
import org.apache.iotdb.session.pool.SessionPool;
import org.apache.iotdb.session.util.Version;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.read.common.RowRecord;
import org.apache.iotdb.tsfile.write.record.Tablet;
import org.apache.iotdb.tsfile.write.schema.MeasurementSchema;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * IoTDB data storage
 *
 * @author ceilzcx
 * @since 2022/10/12
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.iot-db",
        name = "enabled", havingValue = "true")
@Slf4j
public class HistoryIotDbDataStorage extends AbstractHistoryDataStorage {
    private static final String BACK_QUOTE = "`";
    private static final String DOUBLE_QUOTATION_MARKS = "\"";
    private static final String SPACE = " ";
    private static final String DOT = ".";
    /**
     * set ttl never expire
     */
    private static final String NEVER_EXPIRE = "-1";

    /**
     * storage group (存储组)
     */
    private static final String STORAGE_GROUP = "root.hertzbeat";

    private static final String SET_TTL = "set ttl to %s %s";

    private static final String CANCEL_TTL = "unset ttl to %s";

    private static final String SHOW_DEVICES = "SHOW DEVICES %s";

    private static final String SHOW_STORAGE_GROUP = "show storage group";

    private static final String QUERY_HISTORY_SQL
            = "SELECT %s FROM %s WHERE Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT FIRST_VALUE(%s), AVG(%s), MIN_VALUE(%s), MAX_VALUE(%s) FROM %s GROUP BY ([now() - %s, now()), 4h) WITHOUT NULL ANY";

    private SessionPool sessionPool;

    /**
     * Session有这两个字段的set方法,sessionPool暂未发现,目前存储在此类中
     * version: ioTDb version
     * <p>用来区分不同版本的ioTDb</p>
     */
    private Version version;

    private long queryTimeoutInMs;

    public HistoryIotDbDataStorage(WarehouseWorkerPool workerPool,
                                   WarehouseProperties properties,
                                   CommonDataQueue commonDataQueue) {
        super(workerPool, properties, commonDataQueue);

        this.serverAvailable = this.initIotDbSession(properties.getStore().getIotDb());
        this.startStorageData("warehouse-iotdb-data-storage", isServerAvailable());
    }

    private boolean initIotDbSession(WarehouseProperties.StoreProperties.IotDbProperties properties) {
        SessionPool.Builder builder = new SessionPool.Builder();
        builder.host(properties.getHost());
        if (properties.getRpcPort() != null) {
            builder.port(properties.getRpcPort());
        }
        if (properties.getUsername() != null) {
            builder.user(properties.getUsername());
        }
        if (properties.getPassword() != null) {
            builder.password(properties.getPassword());
        }
        if (properties.getNodeUrls() != null && !properties.getNodeUrls().isEmpty()) {
            builder.nodeUrls(properties.getNodeUrls());
        }
        if (properties.getZoneId() != null) {
            builder.zoneId(properties.getZoneId());
        }
        if (properties.getVersion() != null) {
            this.version = properties.getVersion();
        }
        this.queryTimeoutInMs = properties.getQueryTimeoutInMs();
        this.sessionPool = builder.build();
        boolean available = checkConnection();
        if (available) {
            this.initTtl(properties.getExpireTime());
            log.info("IotDB session pool init success");
        }
        return available;
    }

    private boolean checkConnection() {
        try {
            this.sessionPool.executeQueryStatement(SHOW_STORAGE_GROUP);
            return true;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return false;
        }
    }

    private void initTtl(String expireTime) {
        if (expireTime == null || expireTime.isEmpty()) {
            return;
        }
        try {
            if (NEVER_EXPIRE.equals(expireTime)) {
                // 删除原本可能已经存在的ttl
                String cancelTtlSql = String.format(CANCEL_TTL, STORAGE_GROUP);
                this.sessionPool.executeNonQueryStatement(cancelTtlSql);
            } else {
                String sstTtlSql = String.format(SET_TTL, STORAGE_GROUP, expireTime);
                this.sessionPool.executeNonQueryStatement(sstTtlSql);
            }
        } catch (IoTDBConnectionException | StatementExecutionException e) {
            // 失败不影响主业务
            log.error("IoTDB init ttl error, expireTime: {}, error: {}", expireTime, e.getMessage());
        }
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse iotdb] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        // tablet的deviceId添加引号会导致数据插入失败
        List<MeasurementSchema> schemaList = new ArrayList<>();

        // todo MeasurementSchema是在客户端生成的数据结构，编码和压缩没有作用
        // todo 需要使用指定的数据结构，还是需要手动创建timeSeries或template
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
        Map<String, Tablet> tabletMap = new HashMap<>(8);
        try {
            long now = System.currentTimeMillis();
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                String instance = valueRow.getInstance();
                if (!instance.isEmpty()) {
                    instance = String.format("\"%s\"", instance);
                }
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
                    } else {
                        tablet.addValue(fieldsList.get(i).getName(), rowIndex, null);
                    }
                }
            }
            for (Tablet tablet : tabletMap.values()) {
                this.sessionPool.insertTablet(tablet, true);
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error(e.getMessage(), e);
        } finally {
            for (Tablet tablet : tabletMap.values()) {
                tablet.reset();
            }
            tabletMap.clear();
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------IotDb Init Failed---------------\n" +
                    "\t--------------Please Config IotDb--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, instance, true);
        String selectSql = "";
        try {
            if (instance != null) {
                selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), deviceId, history);
                handleHistorySelect(selectSql, "", instanceValuesMap);
            } else {
                // 优先查询底下所有存在device, 如果存在底下所有device的数据, 否则查询deviceId的数据
                List<String> devices = queryAllDevices(deviceId);
                if (devices.isEmpty()) {
                    selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), deviceId, history);
                    handleHistorySelect(selectSql, "", instanceValuesMap);
                } else {
                    // todo 改造成一个select查询: select device1.metric, device2.metric from xxx
                    for (String device : devices) {
                        String prefixDeviceId = getDeviceId(app, metrics, monitorId, null, false);
                        String instanceId = device.substring(prefixDeviceId.length() + 1);
                        selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), deviceId + "." + addQuote(instanceId), history);
                        handleHistorySelect(selectSql, instanceId, instanceValuesMap);
                    }
                }
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error("select error history sql: {}", selectSql);
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private void handleHistorySelect(String selectSql, String instanceId, Map<String, List<Value>> instanceValuesMap)
            throws IoTDBConnectionException, StatementExecutionException {
        SessionDataSetWrapper dataSet = null;
        try {
            dataSet = this.sessionPool.executeQueryStatement(selectSql, this.queryTimeoutInMs);
            log.debug("iot select sql: {}", selectSql);
            while (dataSet.hasNext()) {
                RowRecord rowRecord = dataSet.next();
                long timestamp = rowRecord.getTimestamp();
                double value = rowRecord.getFields().get(0).getDoubleV();
                String strValue = BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceId, k -> new LinkedList<>());
                valueList.add(new Value(strValue, timestamp));
            }
        } finally {
            if (dataSet != null) {
                // 需要关闭结果集！！！否则会造成服务端堆积
                this.sessionPool.closeResultSet(dataSet);
            }
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("\n\t---------------IotDb Init Failed---------------\n" +
                    "\t--------------Please Config IotDb--------------\n" +
                    "\t----------Can Not Use Metric History Now----------\n");
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, instance, true);
        String selectSql = "";
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
                        String prefixDeviceId = getDeviceId(app, metrics, monitorId, null, false);
                        String instanceId = device.substring(prefixDeviceId.length() + 1);
                        selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                                addQuote(metric), addQuote(metric), addQuote(metric), addQuote(metric), deviceId + "." + addQuote(instanceId), history);
                        handleHistoryIntervalSelect(selectSql, instanceId, instanceValuesMap);
                    }
                }
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error("select error history interval sql: {}", selectSql);
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    private void handleHistoryIntervalSelect(String selectSql, String instanceId, Map<String, List<Value>> instanceValuesMap)
            throws IoTDBConnectionException, StatementExecutionException {
        SessionDataSetWrapper dataSet = null;
        try {
            dataSet = this.sessionPool.executeQueryStatement(selectSql, this.queryTimeoutInMs);
            log.debug("iot select sql: {}", selectSql);
            while (dataSet.hasNext()) {
                RowRecord rowRecord = dataSet.next();
                long timestamp = rowRecord.getTimestamp();
                double origin = rowRecord.getFields().get(0).getDoubleV();
                String originStr = BigDecimal.valueOf(origin).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                double avg = rowRecord.getFields().get(1).getDoubleV();
                String avgStr = BigDecimal.valueOf(avg).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                double min = rowRecord.getFields().get(2).getDoubleV();
                String minStr = BigDecimal.valueOf(min).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                double max = rowRecord.getFields().get(3).getDoubleV();
                String maxStr = BigDecimal.valueOf(max).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                Value value = Value.builder()
                        .origin(originStr).mean(avgStr)
                        .min(minStr).max(maxStr)
                        .time(timestamp)
                        .build();
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceId, k -> new LinkedList<>());
                valueList.add(value);
            }
        } finally {
            if (dataSet != null) {
                // 需要关闭结果集！！！否则会造成服务端堆积
                this.sessionPool.closeResultSet(dataSet);
            }
        }
    }

    /**
     * 获取deviceId下的所有设备
     *
     * @param deviceId 设备/实体
     */
    private List<String> queryAllDevices(String deviceId) throws IoTDBConnectionException, StatementExecutionException {
        String showDevicesSql = String.format(SHOW_DEVICES, deviceId + ".*");
        SessionDataSetWrapper dataSet = this.sessionPool.executeQueryStatement(showDevicesSql, this.queryTimeoutInMs);
        List<String> devices = new ArrayList<>();
        while (dataSet.hasNext()) {
            RowRecord rowRecord = dataSet.next();
            devices.add(rowRecord.getFields().get(0).getStringValue());
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

    /**
     * add quote，防止查询时关键字报错(eg: nodes)
     */
    private String addQuote(String text) {
        if (text == null || text.isEmpty()
                || (text.startsWith(DOUBLE_QUOTATION_MARKS) && text.endsWith(DOUBLE_QUOTATION_MARKS))
                || (text.startsWith(BACK_QUOTE) && text.endsWith(BACK_QUOTE))) {
            return text;
        }
        if (this.version != null && this.version.equals(Version.V_0_13)) {
            text = text.replace("'", "\\'");
            text = text.replace("\"", "\\\"");
            text = text.replace("*", "-");
            text = String.format("`%s`", text);
        } else {
            if (text.contains(SPACE) || text.contains(DOT)) {
                text = String.format("\"%s\"", text);
                return text;
            }
        }
        return text;
    }

    @Override
    public void destroy() {
        if (this.sessionPool != null) {
            this.sessionPool.close();
        }
    }
}
