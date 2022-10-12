package com.usthe.warehouse.store;

import com.usthe.common.entity.dto.Value;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.session.Session;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.write.record.Tablet;
import org.apache.iotdb.tsfile.write.schema.MeasurementSchema;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * @author ceilzcx
 * @since 2022/10/12
 */
@Configuration
@AutoConfigureAfter(value = {WarehouseProperties.class})
@ConditionalOnProperty(prefix = "warehouse.store.iotdb",
        name = "enabled", havingValue = "true", matchIfMissing = true)
public class IoTDBDataStorage extends AbstractDataStorage {
    private Session session;

    public IoTDBDataStorage(WarehouseWorkerPool workerPool,
                            WarehouseProperties properties,
                            CommonDataQueue commonDataQueue) {
        super(workerPool, properties, commonDataQueue);

        this.initIoTDBSession(properties.getStore().getIotdb());
        this.startStorageData(true);
    }

    private boolean initIoTDBSession(WarehouseProperties.StoreProperties.IoTDBProperties properties) {
        try {
            this.session = new Session.Builder()
                    .username(properties.getUsername())
                    .password(properties.getPassword())
                    .build();
            this.session.open();
        } catch (IoTDBConnectionException e) {
            e.printStackTrace();
        }
        return true;
    }

    @Override
    void saveData(CollectRep.MetricsData metricsData) {
        String deviceId = "root.hertzbeat." + metricsData.getApp() + "." + metricsData.getMetrics() + "." + metricsData.getId();
        List<MeasurementSchema> schemaList = new ArrayList<>();
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
        int rowIndex = tablet.rowSize++;
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            tablet.addTimestamp(rowIndex, System.currentTimeMillis());
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
        try {
            session.insertTablet(tablet, true);
        } catch (StatementExecutionException | IoTDBConnectionException e) {
            e.printStackTrace();
        } finally {
            tablet.reset();
        }
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

    }
}
