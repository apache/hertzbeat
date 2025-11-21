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

package org.apache.hertzbeat.warehouse.store.history.tsdb.iotdb;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import com.google.common.collect.Maps;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.arrow.RowWrapper;
import org.apache.hertzbeat.common.entity.dto.Value;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.store.history.tsdb.AbstractHistoryDataStorage;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.session.pool.SessionDataSetWrapper;
import org.apache.iotdb.session.pool.SessionPool;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.read.common.RowRecord;
import org.apache.iotdb.tsfile.write.record.Tablet;
import org.apache.iotdb.tsfile.write.schema.MeasurementSchema;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * IoTDB data storage
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.iot-db", name = "enabled", havingValue = "true")
@Slf4j
public class IotDbDataStorage extends AbstractHistoryDataStorage {
    private static final String BACK_QUOTE = "`";
    /**
     * set ttl never expire
     */
    private static final String NEVER_EXPIRE = "-1";

    /**
     * storage group
     */
    private static final String STORAGE_GROUP = "root.hertzbeat";

    private static final String SHOW_DATABASE = "show databases %s";

    private static final String CREATE_DATABASE = "create database %s";

    private static final String SET_TTL = "set ttl to %s %s";

    private static final String CANCEL_TTL = "unset ttl to %s";

    private static final String SHOW_DEVICES = "SHOW DEVICES %s";

    private static final String SHOW_STORAGE_GROUP = "show storage group";

    private static final String QUERY_HISTORY_SQL =
            "SELECT %s FROM %s WHERE Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL =
            "SELECT FIRST_VALUE(%s), AVG(%s), MIN_VALUE(%s), MAX_VALUE(%s) FROM %s GROUP BY ([now() - %s, now()), 4h)";

    private SessionPool sessionPool;

    private long queryTimeoutInMs;

    public IotDbDataStorage(IotDbProperties iotDbProperties) {
        this.serverAvailable = this.initIotDbSession(iotDbProperties);
    }

    private boolean initIotDbSession(IotDbProperties properties) {
        SessionPool.Builder builder = new SessionPool.Builder();
        builder.host(properties.host());
        if (properties.rpcPort() != null) {
            builder.port(properties.rpcPort());
        }
        if (properties.username() != null) {
            builder.user(properties.username());
        }
        if (properties.password() != null) {
            builder.password(properties.password());
        }
        if (properties.nodeUrls() != null && !properties.nodeUrls().isEmpty()) {
            builder.nodeUrls(properties.nodeUrls());
        }
        if (properties.zoneId() != null) {
            builder.zoneId(properties.zoneId());
        }
        this.queryTimeoutInMs = properties.queryTimeoutInMs();
        this.sessionPool = builder.build();
        boolean available = checkConnection();
        if (!available) {
            log.error("IotDB session pool init error with check connection");
            return false;
        }
        available = this.createDatabase();
        if (!available) {
            log.error("IotDB session pool init error with create database");
            return false;
        }
        this.initTtl(properties.expireTime());
        log.info("IotDB session pool init success");
        return true;
    }

    private boolean checkConnection() {
        try {
            this.sessionPool.executeNonQueryStatement(SHOW_STORAGE_GROUP);
            return true;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return false;
        }
    }

    private boolean createDatabase() {
        SessionDataSetWrapper dataSet = null;
        try {
            // if root.hertzbeat database not exist, create database
            String showDatabaseSql = String.format(SHOW_DATABASE, STORAGE_GROUP);
            dataSet = this.sessionPool.executeQueryStatement(showDatabaseSql);
            if (!dataSet.hasNext()) {
                String createDatabaseSql = String.format(CREATE_DATABASE, STORAGE_GROUP);
                this.sessionPool.executeNonQueryStatement(createDatabaseSql);
            }
        } catch (IoTDBConnectionException | StatementExecutionException e) {
            log.error("create database error, error: {}", e.getMessage());
            return false;
        } finally {
            if (dataSet != null) {
                this.sessionPool.closeResultSet(dataSet);
            }
        }
        return true;
    }

    private void initTtl(String expireTime) {
        if (expireTime == null || expireTime.isEmpty()) {
            return;
        }
        try {
            if (NEVER_EXPIRE.equals(expireTime)) {
                // DELETE TTL that might already exist
                String cancelTtlSql = String.format(CANCEL_TTL, STORAGE_GROUP);
                this.sessionPool.executeNonQueryStatement(cancelTtlSql);
            } else {
                String sstTtlSql = String.format(SET_TTL, STORAGE_GROUP, expireTime);
                this.sessionPool.executeNonQueryStatement(sstTtlSql);
            }
        } catch (IoTDBConnectionException | StatementExecutionException e) {
            // Failure does not affect the primary business
            log.error("IoTDB init ttl error, expireTime: {}, error: {}", expireTime, e.getMessage());
        }
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        if (!isServerAvailable() || metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValues().isEmpty()) {
            log.info("[warehouse iotdb] flush metrics data {} is null, ignore.", metricsData.getId());
            return;
        }
        List<MeasurementSchema> schemaList = new ArrayList<>();
        Map<String, Tablet> tabletMap = Maps.newHashMapWithExpectedSize(8);

        // todo Measurement schema is a data structure that is generated on the client side, and encoding and compression have no effect
        try {
            metricsData.getFields().forEach(field -> {
                MeasurementSchema schema = new MeasurementSchema();
                schema.setMeasurementId(field.getName());
                byte type = (byte) field.getType();

                // handle field type
                if (type == CommonConstants.TYPE_NUMBER) {
                    schema.setType(TSDataType.DOUBLE);
                } else if (type == CommonConstants.TYPE_STRING) {
                    schema.setType(TSDataType.TEXT);
                } 
                schemaList.add(schema);
            });

            long now = System.currentTimeMillis();
            RowWrapper rowWrapper = metricsData.readRow();

            while (rowWrapper.hasNextRow()) {
                rowWrapper = rowWrapper.nextRow();

                Map<String, String> labels = Maps.newHashMapWithExpectedSize(8);
                rowWrapper.cellStream().forEach(cell -> {
                    if (cell.getMetadataAsBoolean(MetricDataConstants.LABEL) && !CommonConstants.NULL_VALUE.equals(cell.getValue())) {
                        labels.put(cell.getField().getName(), cell.getValue());
                    }
                });


                String label = JsonUtil.toJson(labels);
                String deviceId = getDeviceId(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId(), label, false);
                if (tabletMap.containsKey(label)) {
                    // Avoid Time repeats
                    now++;
                } else {
                    tabletMap.put(label, new Tablet(deviceId, schemaList));
                }
                Tablet tablet = tabletMap.get(label);
                int rowIndex = tablet.rowSize++;
                tablet.addTimestamp(rowIndex, now);


                rowWrapper.cellStream().forEach(cell -> {
                    if (CommonConstants.NULL_VALUE.equals(cell.getValue())) {
                        tablet.addValue(cell.getField().getName(), rowIndex, null);
                        return;
                    }

                    Byte type = cell.getMetadataAsByte(MetricDataConstants.TYPE);
                    if (type == CommonConstants.TYPE_NUMBER) {
                        tablet.addValue(cell.getField().getName(), rowIndex, Double.parseDouble(cell.getValue()));
                    } else if (type == CommonConstants.TYPE_STRING) {
                        tablet.addValue(cell.getField().getName(), rowIndex, cell.getValue());
                    }
                });
            }


            for (Tablet tablet : tabletMap.values()) {
                this.sessionPool.insertTablet(tablet, true);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        } finally {
            for (Tablet tablet : tabletMap.values()) {
                tablet.reset();
            }
            tabletMap.clear();
        }

    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric,
                                                         String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("""
                    
                    \t---------------IotDb Init Failed---------------
                    \t--------------Please Config IotDb--------------
                    \t----------Can Not Use Metric History Now----------
                    """);
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, label, true);
        String selectSql = "";
        try {
            if (label != null) {
                selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), deviceId, history);
                handleHistorySelect(selectSql, "", instanceValuesMap);
            } else {
                // First query all the devices below, if there is data for all the devices below, otherwise query the data for the deviceId
                List<String> devices = queryAllDevices(deviceId);
                if (devices.isEmpty()) {
                    selectSql = String.format(QUERY_HISTORY_SQL, addQuote(metric), deviceId, history);
                    handleHistorySelect(selectSql, "", instanceValuesMap);
                } else {
                    // todo Transform to a select query: Select Device 1.0. Metric, Device2. Metric from XXX
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

    private void handleHistorySelect(String selectSql, String labels, Map<String, List<Value>> instanceValuesMap)
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
                List<Value> valueList = instanceValuesMap.computeIfAbsent(labels, k -> new LinkedList<>());
                valueList.add(new Value(strValue, timestamp));
            }
        } finally {
            if (dataSet != null) {
                // need to close the result set! ! ! otherwise it will cause server-side heap
                this.sessionPool.closeResultSet(dataSet);
            }
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics,
                                                                 String metric, String label, String history) {
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            log.error("""
                    
                    \t---------------IotDb Init Failed---------------
                    \t--------------Please Config IotDb--------------
                    \t----------Can Not Use Metric History Now----------
                    """);
            return instanceValuesMap;
        }
        String deviceId = getDeviceId(app, metrics, monitorId, label, true);
        String selectSql;
        if (label != null) {
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
                    String instance = device.substring(prefixDeviceId.length() + 1);
                    selectSql = String.format(QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL,
                            addQuote(metric), addQuote(metric), addQuote(metric), addQuote(metric), deviceId + "." + addQuote(instance), history);
                    handleHistoryIntervalSelect(selectSql, instance, instanceValuesMap);
                }
            }
        }
        return instanceValuesMap;
    }

    private void handleHistoryIntervalSelect(String selectSql, String instance,
                                             Map<String, List<Value>> instanceValuesMap) {
        SessionDataSetWrapper dataSet = null;
        try {
            dataSet = this.sessionPool.executeQueryStatement(selectSql, this.queryTimeoutInMs);
            log.debug("iot select sql: {}", selectSql);
            while (dataSet.hasNext()) {
                RowRecord rowRecord = dataSet.next();
                if (rowRecord.hasNullField()) {
                    continue;
                }
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
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instance, k -> new LinkedList<>());
                valueList.add(value);
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error("select error history interval sql: {}", selectSql);
            log.error(e.getMessage(), e);
        } finally {
            if (dataSet != null) {
                // need to close the result set! ! ! otherwise it will cause server-side heap
                this.sessionPool.closeResultSet(dataSet);
            }
        }
    }

    /**
     * Query all devices by deviceId
     *
     * @param deviceId deviceId
     */
    private List<String> queryAllDevices(String deviceId) {
        String showDevicesSql = String.format(SHOW_DEVICES, deviceId + ".*");
        SessionDataSetWrapper dataSet = null;
        List<String> devices = new ArrayList<>();
        try {
            dataSet = this.sessionPool.executeQueryStatement(showDevicesSql, this.queryTimeoutInMs);
            while (dataSet.hasNext()) {
                RowRecord rowRecord = dataSet.next();
                devices.add(rowRecord.getFields().get(0).getStringValue());
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error("query show all devices sql error. sql: {}", showDevicesSql);
            log.error(e.getMessage(), e);
        } finally {
            if (dataSet != null) {
                // need to close the result set! ! ! otherwise it will cause server-side heap
                this.sessionPool.closeResultSet(dataSet);
            }
        }
        return devices;
    }

    /**
     * use ${group}.${app}.${metrics}.${monitor}.${labels} to get device id if there is a way to get instanceId
     * otherwise use  ${group}.${app}.${metrics}.${monitor}
     * Use  ${group}.${app}.${metrics}.${monitor}.*  to get all instance data when you tend to query
     */
    private String getDeviceId(String app, String metrics, Long monitorId, String labels, boolean useQuote) {
        String deviceId = STORAGE_GROUP + "."
                + (useQuote ? addQuote(app) : app) + "."
                + (useQuote ? addQuote(metrics) : metrics) + "."
                + addQuote(monitorId.toString());
        if (labels != null && !labels.isEmpty() && !labels.equals(CommonConstants.NULL_VALUE)) {
            deviceId += "." + addQuote(labels);
        }
        return deviceId;
    }

    /**
     * add quote，prevents keyword errors during queries(eg: nodes)
     */
    private String addQuote(String text) {
        if (text == null || text.isEmpty() || (text.startsWith(BACK_QUOTE) && text.endsWith(BACK_QUOTE))) {
            return text;
        }
        text = text.replace("*", "-");
        text = String.format("`%s`", text);
        return text;
    }

    @Override
    public void destroy() {
        if (this.sessionPool != null) {
            this.sessionPool.close();
        }
    }
}
