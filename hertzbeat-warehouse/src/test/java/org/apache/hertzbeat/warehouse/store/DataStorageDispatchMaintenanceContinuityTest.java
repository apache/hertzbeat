/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.warehouse.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.function.BiConsumer;
import org.apache.hertzbeat.common.entity.plugin.PluginContext;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.plugin.PostCollectPlugin;
import org.apache.hertzbeat.plugin.runner.PluginRunner;
import org.apache.hertzbeat.warehouse.WarehouseWorkerPool;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataWriter;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorAvailability;
import org.apache.hertzbeat.warehouse.store.metadata.MonitorStatusMetadataWriter;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataWriter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class DataStorageDispatchMaintenanceContinuityTest {

    @Test
    void maintenanceMetadataRejectionDoesNotInterruptTelemetryPersistenceOrder(CapturedOutput output) {
        MonitorStatusMetadataWriter statusWriter = mock(MonitorStatusMetadataWriter.class);
        HistoryDataWriter historyWriter = mock(HistoryDataWriter.class);
        RealTimeDataWriter realTimeWriter = mock(RealTimeDataWriter.class);
        PluginRunner pluginRunner = mock(PluginRunner.class);
        MetadataWriteAdmissionException rejection = MetadataWriteAdmissionException.metadataWritesPaused();
        doThrow(rejection).when(statusWriter).updateAvailability(anyLong(), any());
        DataStorageDispatch dispatch = new DataStorageDispatch(
                mock(CommonDataQueue.class),
                mock(WarehouseWorkerPool.class),
                statusWriter,
                List.of(historyWriter),
                realTimeWriter,
                pluginRunner);
        CollectRep.MetricsData metrics = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS)
                .build();

        dispatch.persistMetricsData(metrics);

        InOrder order = inOrder(statusWriter, historyWriter, pluginRunner, realTimeWriter);
        order.verify(statusWriter).updateAvailability(42L, MonitorAvailability.UP);
        order.verify(historyWriter).saveData(metrics);
        order.verify(pluginRunner).pluginExecute(eq(PostCollectPlugin.class), pluginExecution());
        order.verify(realTimeWriter).saveData(metrics);
        assertThat(output).doesNotContain("ERROR").doesNotContain("MetadataWriteAdmissionException");
    }

    @Test
    void ordinaryMetadataFailureAlsoLeavesTelemetryPipelineRunning() {
        MonitorStatusMetadataWriter statusWriter = mock(MonitorStatusMetadataWriter.class);
        HistoryDataWriter historyWriter = mock(HistoryDataWriter.class);
        RealTimeDataWriter realTimeWriter = mock(RealTimeDataWriter.class);
        PluginRunner pluginRunner = mock(PluginRunner.class);
        doThrow(new IllegalStateException("metadata unavailable"))
                .when(statusWriter).updateAvailability(anyLong(), any());
        DataStorageDispatch dispatch = dispatch(statusWriter, historyWriter, realTimeWriter, pluginRunner);
        CollectRep.MetricsData metrics = metrics();

        dispatch.persistMetricsData(metrics);

        InOrder order = inOrder(statusWriter, historyWriter, pluginRunner, realTimeWriter);
        order.verify(statusWriter).updateAvailability(42L, MonitorAvailability.UP);
        order.verify(historyWriter).saveData(metrics);
        order.verify(pluginRunner).pluginExecute(eq(PostCollectPlugin.class), pluginExecution());
        order.verify(realTimeWriter).saveData(metrics);
    }

    @Test
    void historyFailureSkipsPluginButStillUpdatesRealtime() {
        MonitorStatusMetadataWriter statusWriter = mock(MonitorStatusMetadataWriter.class);
        HistoryDataWriter historyWriter = mock(HistoryDataWriter.class);
        RealTimeDataWriter realTimeWriter = mock(RealTimeDataWriter.class);
        PluginRunner pluginRunner = mock(PluginRunner.class);
        doThrow(new IllegalStateException("history unavailable")).when(historyWriter).saveData(any());
        DataStorageDispatch dispatch = dispatch(statusWriter, historyWriter, realTimeWriter, pluginRunner);
        CollectRep.MetricsData metrics = metrics();

        assertThatThrownBy(() -> dispatch.persistMetricsData(metrics))
                .isInstanceOf(IllegalStateException.class);

        verify(statusWriter).updateAvailability(42L, MonitorAvailability.UP);
        verify(historyWriter).saveData(metrics);
        verify(pluginRunner, never()).pluginExecute(eq(PostCollectPlugin.class), pluginExecution());
        verify(realTimeWriter).saveData(metrics);
    }

    private DataStorageDispatch dispatch(
            MonitorStatusMetadataWriter statusWriter,
            HistoryDataWriter historyWriter,
            RealTimeDataWriter realTimeWriter,
            PluginRunner pluginRunner) {
        return new DataStorageDispatch(
                mock(CommonDataQueue.class), mock(WarehouseWorkerPool.class), statusWriter,
                List.of(historyWriter), realTimeWriter, pluginRunner);
    }

    private CollectRep.MetricsData metrics() {
        return CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS)
                .build();
    }

    @SuppressWarnings("unchecked")
    private BiConsumer<PostCollectPlugin, PluginContext> pluginExecution() {
        return any(BiConsumer.class);
    }
}
