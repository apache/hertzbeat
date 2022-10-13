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

    // the second %s is alias
    private static final String QUERY_HISTORY_WITH_INSTANCE_SQL
            = "SELECT `instance` as `instance`, %s as %s FROM %s WHERE instance = %s AND Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_SQL
            = "SELECT `instance` as `instance`, %s as %s FROM %s WHERE Time >= now() - %s order by Time desc";
    private static final String QUERY_HISTORY_INTERVAL_WITH_INSTANCE_SQL
            = "SELECT first(%s), avg(%s), min(%s), max(%s) FROM %s WHERE instance = %s AND Time >= now() - %s interval(4h)";
    private static final String QUERY_INSTANCE_SQL
            = "SELECT DISTINCT instance FROM %s WHERE ts >= now - 1w";

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
        String deviceId = getDeviceId(metricsData.getApp(), metricsData.getMetrics(), metricsData.getId(), false);
        List<MeasurementSchema> schemaList = new ArrayList<>();

        // add instance
        MeasurementSchema instanceSchema = new MeasurementSchema();
        instanceSchema.setMeasurementId("instance");
        instanceSchema.setType(TSDataType.TEXT);
        schemaList.add(instanceSchema);

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
        Tablet tablet = new Tablet(deviceId, schemaList);
        try {
            // 避免Time重复
            long now = System.currentTimeMillis();
            for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                int rowIndex = tablet.rowSize++;
                tablet.addTimestamp(rowIndex, now++);
                tablet.addValue("instance", rowIndex, valueRow.getInstance());
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

            session.insertTablet(tablet, true);
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            e.printStackTrace();
        } finally {
            tablet.reset();
        }
    }

    @Override
    public Map<String, List<Value>> getHistoryMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        String deviceId = getDeviceId(app, metrics, monitorId, true);
        String selectSql =  instance == null ? String.format(QUERY_HISTORY_SQL, addQuote(metric), addQuote(metric), deviceId, history) :
                String.format(QUERY_HISTORY_WITH_INSTANCE_SQL, addQuote(metric), addQuote(metric), deviceId, instance, history);
        log.debug(selectSql);
        Map<String, List<Value>> instanceValuesMap = new HashMap<>(8);
        if (!isServerAvailable()) {
            return instanceValuesMap;
        }
        try {
            SessionDataSet dataSet = this.session.executeQueryStatement(selectSql);
            while (dataSet.hasNext()) {
                RowRecord record = dataSet.next();
                long timestamp = record.getTimestamp();
                String instanceValue = record.getFields().get(0).getStringValue();
                double value = record.getFields().get(1).getDoubleV();
                String strValue = BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
                List<Value> valueList = instanceValuesMap.computeIfAbsent(instanceValue, k -> new LinkedList<>());
                valueList.add(new Value(strValue, timestamp));
            }
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            log.error(e.getMessage(), e);
        }
        return instanceValuesMap;
    }

    @Override
    public Map<String, List<Value>> getHistoryIntervalMetricData(Long monitorId, String app, String metrics, String metric, String instance, String history) {
        return null;
    }

    private String getDeviceId(String app, String metrics, Long monitorId, boolean useQuote) {
        return STORAGE_GROUP + "." + (useQuote ? addQuote(app) : app) + "." + (useQuote ? addQuote(metrics) : metrics) + "." + monitorId;
    }

    // add quote，否则关键字会报错(eg: nodes)
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
