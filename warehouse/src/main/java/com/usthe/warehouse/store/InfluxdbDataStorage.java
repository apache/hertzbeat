package com.usthe.warehouse.store;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.WriteApi;
import com.influxdb.client.WriteOptions;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.warehouse.MetricsDataQueue;
import com.usthe.warehouse.WarehouseProperties;
import com.usthe.warehouse.WarehouseWorkerPool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

import java.time.Instant;
import java.util.List;

/**
 * influxdb存储采集数据
 * @author tom
 * @date 2021/11/24 18:23
 */
@Configuration
@AutoConfigureAfter(value = {WarehouseProperties.class})
@ConditionalOnProperty(prefix = "warehouse.store.influxdb",
        name = "enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class InfluxdbDataStorage implements DisposableBean {

    private InfluxDBClient influxClient;
    private WriteApi writeApi;
    private WarehouseWorkerPool workerPool;
    private MetricsDataQueue dataQueue;

    public InfluxdbDataStorage (WarehouseProperties properties, WarehouseWorkerPool workerPool,
                                MetricsDataQueue dataQueue) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        initInfluxDbClient(properties);
        startStorageData();
    }

    private void startStorageData() {
        Runnable runnable = () -> {
            Thread.currentThread().setName("warehouse-influxdb-data-storage");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    CollectRep.MetricsData metricsData = dataQueue.pollInfluxMetricsData();
                    if (metricsData != null) {
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

    private void initInfluxDbClient(WarehouseProperties properties) {
        if (properties == null || properties.getStore() == null || properties.getStore().getInfluxdb() == null) {
            log.error("init error, please config Warehouse influxdb props in application.yml");
            throw new IllegalArgumentException("please config Warehouse influxdb props");
        }
        WarehouseProperties.StoreProperties.InfluxdbProperties influxdbProp = properties.getStore().getInfluxdb();
        influxClient = InfluxDBClientFactory.create(influxdbProp.getServers(), influxdbProp.getToken().toCharArray(),
                influxdbProp.getOrg(), influxdbProp.getBucket());
        WriteOptions writeOptions = WriteOptions.builder()
                .batchSize(1000)
                .bufferLimit(1000)
                .jitterInterval(1000)
                .retryInterval(5000)
                .build();
        writeApi = influxClient.makeWriteApi(writeOptions);
    }


    public void saveData(CollectRep.MetricsData metricsData) {
        String measurement = metricsData.getApp() + "_" + metricsData.getMetrics();
        String monitorId = String.valueOf(metricsData.getId());
        Instant collectTime = Instant.ofEpochMilli(metricsData.getTime());

        List<CollectRep.Field> fields = metricsData.getFieldsList();
        for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
            Point point = Point.measurement(measurement)
                    .addTag("id", monitorId)
                    .addTag("instance", valueRow.getInstance())
                    .time(collectTime, WritePrecision.MS);
            for (int index = 0; index < fields.size(); index++) {
                CollectRep.Field field = fields.get(index);
                String value = valueRow.getColumns(index);
                if (field.getType() == CommonConstants.TYPE_NUMBER) {
                    // number data
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        point.addField(field.getName(), (Number) null);
                    } else {
                        try {
                            double number = Double.parseDouble(value);
                            point.addField(field.getName(), number);
                        } catch (Exception e) {
                            log.warn(e.getMessage());
                            point.addField(field.getName(), (Number) null);
                        }
                    }
                } else {
                    // string
                    if (CommonConstants.NULL_VALUE.equals(value)) {
                        point.addField(field.getName(), (String) null);
                    } else {
                        point.addField(field.getName(), value);
                    }
                }
            }
            writeApi.writePoint(point);
        }
    }


    @Override
    public void destroy() throws Exception {
        if (writeApi != null) {
            writeApi.close();
        }
        if (influxClient != null) {
            influxClient.close();
        }
    }
}
