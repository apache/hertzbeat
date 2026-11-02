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

package org.apache.hertzbeat.manager.monitor.collection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ScriptProtocol;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

class InlineCollectionPlanServiceTest {
    MonitorService monitors = mock(MonitorService.class);
    AppService apps = mock(AppService.class);
    CollectJobScheduling scheduler = mock(CollectJobScheduling.class);
    MonitorDto dto = new MonitorDto();
    Job definition;
    InlineCollectionPlanService service;

    @BeforeEach
    void init() {
        dto.setMonitor(
                Monitor.builder()
                        .id(7L)
                        .app("inline-fixture")
                        .name("fixture")
                        .intervals(600)
                        .status((byte) 0)
                        .build());
        dto.setParams(List.of(), false);
        definition =
                Job.builder()
                        .app("inline-fixture")
                        .metrics(
                                List.of(
                                        Metrics.builder()
                                                .name("fixture")
                                                .protocol("script")
                                                .priority((byte) 0)
                                                .script(
                                                        ScriptProtocol.builder()
                                                                .scriptTool("bash")
                                                                .scriptCommand("printf fixture")
                                                                .charset("UTF-8")
                                                                .parseType("oneRow")
                                                                .build())
                                                .build()))
                        .build();
        when(monitors.getMonitorDto(7L)).thenReturn(dto);
        when(apps.getAppDefine("inline-fixture")).thenAnswer(x -> definition.clone());
        service = new InlineCollectionPlanService(monitors, apps, scheduler);
    }

    @Test
    void previewIsPureAndFreezesTheActualInvocation() {
        var p = service.prepare("owner/session", 7L);
        assertEquals(List.of("bash", "-c", "printf fixture"), p.argv());
        assertTrue(p.oneShot());
        assertEquals(p, service.preview("owner/session", p.planId(), p.planHash(), 7L));
        verifyNoInteractions(scheduler);
        assertThrows(
                IllegalStateException.class,
                () -> service.preview("other/session", p.planId(), p.planHash(), 7L));
        assertThrows(
                IllegalStateException.class,
                () -> service.preview("owner/session", p.planId(), p.planHash(), 8L));
    }

    @Test
    void templateParametersTargetAndScheduleDriftInvalidateBeforeDispatch() {
        var p = service.prepare("owner/session", 7L);
        definition.getMetrics().getFirst().getScript().setScriptCommand("printf changed");
        assertThrows(
                IllegalStateException.class,
                () -> service.execute("owner/session", p.planId(), p.planHash(), 7L, () -> true));
        verifyNoInteractions(scheduler);
    }

    @Test
    void unsupportedRemoteFileAndCredentialPlansNeverProbe() {
        definition.getMetrics().getFirst().getScript().setScriptPath("/tmp/fixture.sh");
        assertThrows(IllegalStateException.class, () -> service.prepare("owner/session", 7L));
        definition.getMetrics().getFirst().getScript().setScriptPath(null);
        dto.setCollector("remote");
        assertThrows(IllegalStateException.class, () -> service.prepare("owner/session", 7L));
        dto.setCollector(null);
        Param password = new Param();
        password.setField("password");
        password.setType((byte) 2);
        password.setParamValue("synthetic");
        dto.setParams(List.of(password), false);
        assertThrows(IllegalStateException.class, () -> service.prepare("owner/session", 7L));
        verifyNoInteractions(scheduler);
    }

    @Test
    void approvedFakeCollectorConsumesExactCommandAtMostOnceAndReturnsNoRawOutput() {
        var p = service.prepare("owner/session", 7L);
        when(scheduler.collectLocalApprovedJob(any()))
                .thenAnswer(
                        x -> {
                            Job job = x.getArgument(0);
                            var m = job.getMetrics().getFirst();
                            org.apache.hertzbeat.common.entity.job.InlineCollectionPermit.find(m)
                                    .consume(
                                            List.of("bash", "-c", m.getScript().getScriptCommand()),
                                            m.getScript().getWorkDirectory());
                            org.apache.hertzbeat.common.entity.job.InlineCollectionPermit.find(m).markStarted();
                            return List.of(
                                    CollectRep.MetricsData.newBuilder()
                                            .setCode(CollectRep.Code.SUCCESS)
                                            .setMsg("PRIVATE_RAW_OUTPUT")
                                            .build());
                        });
        var result = service.execute("owner/session", p.planId(), p.planHash(), 7L, () -> true);
        assertTrue(result.verified());
        assertFalse(result.toString().contains("PRIVATE_RAW_OUTPUT"));
        assertThrows(
                IllegalStateException.class,
                () -> service.execute("owner/session", p.planId(), p.planHash(), 7L, () -> true));
        verify(scheduler, times(1)).collectLocalApprovedJob(any());
    }

    @Test
    void lateCancellationAndTemplateDriftAreRecheckedInsideCollector() {
        var allowed = new AtomicBoolean(true);
        var p = service.prepare("owner/session", 7L);
        when(scheduler.collectLocalApprovedJob(any()))
                .thenAnswer(
                        x -> {
                            allowed.set(false);
                            Job job = x.getArgument(0);
                            var m = job.getMetrics().getFirst();
                            org.apache.hertzbeat.common.entity.job.InlineCollectionPermit.find(m).consume(p.argv(), p.directory());
                            return List.of();
                        });
        assertThrows(
                IllegalStateException.class,
                () -> service.execute("owner/session", p.planId(), p.planHash(), 7L, allowed::get));
    }

    @Test
    void parameterAndPeriodicActivationChangesInvalidatePreparedPlan() {
        var p = service.prepare("owner/session", 7L);
        var changed = dto.getMonitor();
        changed.setIntervals(900);
        dto.setMonitor(changed);
        assertThrows(
                IllegalStateException.class,
                () -> service.execute("owner/session", p.planId(), p.planHash(), 7L, () -> true));
        changed.setIntervals(600);
        changed.setStatus((byte) 1);
        dto.setMonitor(changed);
        assertThrows(IllegalStateException.class, () -> service.prepare("owner/session", 7L));
        verifyNoInteractions(scheduler);
    }

    @Test
    @org.junit.jupiter.api.Timeout(10)
    void localTimerRenderingPreservesThePermitUntilTheRealHarmlessProcessBoundary()
            throws Exception {
        definition.getMetrics().getFirst().getScript().setScriptCommand("printf 'value\\n1\\n'");
        var holder =
                new java.util.concurrent.atomic.AtomicReference<
                        org.apache.hertzbeat.collector.timer.TimerDispatcher>();
        org.springframework.beans.factory.ObjectProvider<
                        org.apache.hertzbeat.collector.dispatch.MetricsTaskDispatch>
                provider = mock(org.springframework.beans.factory.ObjectProvider.class);
        when(provider.getObject())
                .thenReturn(
                        timeout -> {
                            var job =
                                    ((org.apache.hertzbeat.collector.timer.WheelTimerTask)
                                                    timeout.task())
                                            .getJob();
                            var row = CollectRep.MetricsData.newBuilder();
                            try {
                                new org.apache.hertzbeat.collector.collect.script
                                                .ScriptCollectImpl()
                                        .collect(row, job.getMetrics().getFirst());
                            } catch (Exception rejected) {
                                row.setCode(CollectRep.Code.FAIL);
                            }
                            holder.get().responseSyncJobData(job.getId(), List.of(row.build()));
                        });
        var timer = new org.apache.hertzbeat.collector.timer.TimerDispatcher(provider);
        holder.set(timer);
        var local =
                new org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService(
                        timer,
                        null,
                        mock(org.apache.hertzbeat.collector.dispatch.WorkerPool.class));
        when(scheduler.collectLocalApprovedJob(any()))
                .thenAnswer(x -> local.collectSyncJobData(x.getArgument(0)));
        try {
            var p = service.prepare("owner/session", 7L);
            var result = service.execute("owner/session", p.planId(), p.planHash(), 7L, () -> true);
            assertTrue(result.started());
        } finally {
            timer.destroy();
        }
    }
}
