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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertDefineBindDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.apache.hertzbeat.manager.support.exception.MonitorDatabaseException;
import org.apache.hertzbeat.manager.support.exception.MonitorDetectException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.aggregator.ArgumentsAccessor;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * newBranch feature-clickhouse#179
 * <a href="https://www.cnblogs.com/it1042290135/p/16202478.html">...</a>
 * <p>
 * <a href="http://clickhouse:9363/metrics">...</a>
 * docker run -d --name some-clickhouse-server -p 8123:8123 -p 9009:9009 -p 9090:9000 -p 9363:9363
 * --ulimit nofile=262144:262144 --volume=/opt/clickhouse/data:/var/lib/clickhouse --volume=/opt/clickhouse/log:/var/log/clickhouse-server
 * --volume=/opt/clickhouse/conf/config.xml:/etc/clickhouse-server/config.xml --volume=/opt/clickhouse/conf/users.xml:/etc/clickhouse-server/users.xml clickhouse/clickhouse-server
 * <p>
 * <p>
 * <a href="https://hub.docker.com/r/clickhouse/clickhouse-server/">...</a>
 * docker run -d -p 18123:8123 -p19000:9000 --name some-clickhouse-server --ulimit nofile=262144:262144 clickhouse/clickhouse-server
 * curl '<a href="http://localhost:18123/">...</a>'
 * web UI
 * <a href="http://localhost:18123/play">...</a>
 * <p>
 * clickhouse client -h 127.0.0.1 -d default -m -u default --password 123456
 * Test case for {@link MonitorService}
 *
 * @see LabelServiceTest
 */
@ExtendWith(MockitoExtension.class)
class MonitorServiceTest {

    @InjectMocks
    private MonitorServiceImpl monitorService = new MonitorServiceImpl(List.of());

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private ParamDao paramDao;

    @Mock
    private AppService appService;

    @Mock
    private LabelService tagService;

    @Mock
    private CollectJobScheduling collectJobScheduling;

    @Mock
    private AlertDefineBindDao alertDefineBindDao;

    @Mock
    private MonitorBindDao monitorBindDao;

    @Mock
    private CollectorDao collectorDao;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Mock
    private ApplicationContext applicationContext;

    /**
     * Properties cannot be directly mock, test execution before - manual assignment
     */
    @BeforeEach
    public void setUp() {
    }

    @Test
    void detectMonitorEmpty() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .host("localhost")
                .build();
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);

        List<CollectRep.MetricsData> collectRep = new ArrayList<>();
        when(collectJobScheduling.collectSyncJobData(job)).thenReturn(collectRep);

        List<Param> params = Collections.singletonList(new Param());
        assertThrows(MonitorDetectException.class, () -> monitorService.detectMonitor(monitor, params, null));
    }

    /**
     * Probe failed - Timed out
     */
    @Test
    void detectMonitorFail() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .host("localhost")
                .build();
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);

        List<CollectRep.MetricsData> collectRep = new ArrayList<>();

        CollectRep.MetricsData failCode = CollectRep.MetricsData.newBuilder()
                .setCode(CollectRep.Code.TIMEOUT).setMsg("collect timeout").build();
        collectRep.add(failCode);
        when(collectJobScheduling.collectSyncJobData(job)).thenReturn(collectRep);

        List<Param> params = Collections.singletonList(new Param());
        assertThrows(MonitorDetectException.class, () -> monitorService.detectMonitor(monitor, params, null));
    }

    @Test
    void addMonitorSuccess() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .host("localhost")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectJobScheduling.addAsyncCollectJob(job, null)).thenReturn(1L);
        when(monitorDao.save(monitor)).thenReturn(monitor);
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.saveAll(params)).thenReturn(params);
        assertDoesNotThrow(() -> monitorService.addMonitor(monitor, params, null, null));
    }

    @Test
    void addMonitorException() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .host("localhost")
                .app("demoApp")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectJobScheduling.addAsyncCollectJob(job, null)).thenReturn(1L);
        List<Param> params = Collections.singletonList(new Param());
        when(monitorDao.save(monitor)).thenThrow(RuntimeException.class);
        assertThrows(MonitorDatabaseException.class, () -> monitorService.addMonitor(monitor, params, null, null));
    }

    /**
     * Parameter verification - The same task name already exists in the database
     */
    @Test
    void validateMonitorName() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(2L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Monitoring name already exists!", e.getMessage());
        }
    }

    /**
     * Parameter check - The required parameter is not filled
     */
    @Test
    void validateRequireMonitorParams() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(null)
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        ParamDefine pd = ParamDefine.builder()
                .required(true)
                .field(field)
                .build();
        paramDefines.add(pd);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " is required.", e.getMessage());
        }
    }

    /**
     * Parameter check - Error for required parameter type
     */
    @Test
    void validateMonitorParamsType() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue("str")
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type("number")
                .range("[0,233]")
                .field(field)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " is invalid.", e.getMessage());
        }
    }

    /**
     * Parameter verification - This parameter is mandatory. - Integer parameter range
     */
    @Test
    void validateMonitorParamsRange() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue("1150")
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type("number")
                .range("[0,233]")
                .field(field)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " over range " + paramDefine.getRange(), e.getMessage());
        }
    }

    /**
     * Parameter check - Required - Length of the text parameter
     */
    @Test
    void validateMonitorParamsTextLimit() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue("1150")
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        Short limit = 3;
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type("text")
                .limit(limit)
                .field(field)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " over limit " + limit, e.getMessage());
        }
    }

    /**
     * Parameter verification - Host IP address Parameter format
     */
    @ParameterizedTest
    @CsvSource({
            "Jane, true",
            "192.168.63.1, false"
    })
    void validateMonitorParamsHost(ArgumentsAccessor arguments) {
        String value = arguments.getString(0);
        Boolean checkException = arguments.getBoolean(1);

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(value)
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        Short limit = 3;
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type("host")
                .limit(limit)
                .field(field)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            if (checkException) {
                assertEquals("Params field " + field + " value " + value + " is invalid host value.", e.getMessage());
            }
        }
    }

    /**
     * Parameter check - Boolean type
     */
    @ParameterizedTest
    @CsvSource({
            "22, true",
            "true, false"
    })
    void validateMonitorParamsBoolean(ArgumentsAccessor arguments) {
        String value = arguments.getString(0);
        Boolean checkException = arguments.getBoolean(1);

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(value)
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "boolean";
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type(type)
                .limit(limit)
                .field(field)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            if (checkException) {
                assertEquals("Params field " + field + " value "
                        + value + " is invalid boolean value.", e.getMessage());
            }
        }
    }

    /**
     * Parameter check - Boolean type
     */
    @ParameterizedTest
    @CsvSource({
            "wrongValue, true",
            "zh, false"
    })
    void validateMonitorParamsRadio(ArgumentsAccessor arguments) {
        String value = arguments.getString(0);
        Boolean checkException = arguments.getBoolean(1);

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(value)
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "radio";

        List<ParamDefine.Option> options = new ArrayList<>();
        options.add(new ParamDefine.Option("language", "zh"));
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type(type)
                .limit(limit)
                .field(field)
                .options(options)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            if (checkException) {
                assertEquals("Params field " + field + " value "
                        + param.getParamValue() + " is invalid option value", e.getMessage());
            }
        }
    }

    /**
     * Parameter check - No defined type
     */
    @ParameterizedTest
    @CsvSource({
            "wrongValue, true",
            "zh, false"
    })
    void validateMonitorParamsNone(ArgumentsAccessor arguments) {
        String value = arguments.getString(0);
        Boolean checkException = arguments.getBoolean(1);

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(value)
                .build();
        params.add(param);
        dto.setParams(params);
        Monitor monitor = Monitor.builder().name("memory").host("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").host("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefine> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "none";

        List<ParamDefine.Option> options = new ArrayList<>();
        options.add(new ParamDefine.Option("language", "zh"));
        ParamDefine paramDefine = ParamDefine.builder()
                .required(true)
                .type(type)
                .limit(limit)
                .field(field)
                .options(options)
                .build();
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            if (checkException) {
                assertEquals("ParamDefine type " + paramDefine.getType() + " is invalid.", e.getMessage());
            }
        }
    }

    @Test
    void modifyMonitor() {
        String value = "value";

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .paramValue(value)
                .build();
        params.add(param);
        dto.setParams(params);
        long monitorId = 1L;
        Monitor monitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").host("host").id(monitorId).build();
        dto.setMonitor(monitor);
        when(monitorDao.findById(monitorId)).thenReturn(Optional.empty());
        try {
            monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null);
        } catch (IllegalArgumentException e) {
            assertEquals("The Monitor " + monitorId + " not exists", e.getMessage());
        }
        reset();
        /*
          The [monitoring type] of monitor cannot be modified.
         */
        Monitor existErrorMonitor = Monitor.builder().app("app2").name("memory").host("host").id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existErrorMonitor));
        try {
            monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null);
        } catch (IllegalArgumentException e) {
            assertEquals("Can not modify monitor's app type", e.getMessage());
        }
        reset();
        Monitor existOkMonitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").host("host").id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existOkMonitor));
        when(monitorDao.save(monitor)).thenThrow(RuntimeException.class);

        assertThrows(MonitorDatabaseException.class, () -> monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null));
    }

    @Test
    void deleteMonitor() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);

        assertDoesNotThrow(() -> monitorService.deleteMonitor(1L));
    }

    @Test
    void deleteMonitors() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(() -> monitorService.deleteMonitors(ids));
    }

    @Test
    void getMonitorDto() {
        long id = 1L;
        Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
        when(monitorDao.findById(id)).thenReturn(Optional.of(monitor));
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.findParamsByMonitorId(id)).thenReturn(params);
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitor.getId())).thenReturn(Optional.empty());
        MonitorDto monitorDto = monitorService.getMonitorDto(id);
        assertNotNull(monitorDto);
    }

    @Test
    void getMonitors() {
        doReturn(Page.empty()).when(monitorDao).findAll(any(Specification.class), any(PageRequest.class));
        assertNotNull(monitorService.getMonitors(null, null, null, null, "gmtCreate", "desc", 1, 1, null));
    }

    @Test
    void cancelManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(() -> monitorService.cancelManageMonitors(ids));
    }

    @Test
    void enableManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitor.setStatus(CommonConstants.MONITOR_PAUSED_CODE);
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        job.setParams(new ArrayList<>());
        when(appService.getAppDefine(monitors.get(0).getApp())).thenReturn(job);
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.findParamsByMonitorId(monitors.get(0).getId())).thenReturn(params);
        assertDoesNotThrow(() -> monitorService.enableManageMonitors(ids));
    }

    @Test
    void getAllAppMonitorsCount() {

        List<AppCount> appCounts = new ArrayList<>();
        AppCount appCount = new AppCount();
        appCount.setApp("test");
        appCount.setStatus(CommonConstants.MONITOR_UP_CODE);
        appCounts.add(appCount);
        when(monitorDao.findAppsStatusCount()).thenReturn(appCounts);


        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(appCounts.get(0).getApp())).thenReturn(job);

        assertDoesNotThrow(() -> monitorService.getAllAppMonitorsCount());
    }

    @Test
    void getMonitor() {
        long monitorId = 1L;
        when(monitorDao.findById(monitorId)).thenReturn(Optional.empty());
        assertDoesNotThrow(() -> monitorService.getMonitor(monitorId));
    }

    @Test
    void updateMonitorStatus() {
        assertDoesNotThrow(() -> monitorService.updateMonitorStatus(1L, CommonConstants.MONITOR_UP_CODE));
    }

    @Test
    void getAppMonitors() {
        assertDoesNotThrow(() -> monitorDao.findMonitorsByAppEquals("test"));
    }

    @Test
    void getMonitorMetrics() {
        Assertions.assertDoesNotThrow(() -> appService.getAppDefineMetricNames("test"));
    }

    @Test
    void copyMonitors() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .host("localhost")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        List<Param> params = Collections.singletonList(new Param());
        when(monitorDao.findById(1L)).thenReturn(Optional.of(monitor));
        when(paramDao.findParamsByMonitorId(1L)).thenReturn(params);
        assertDoesNotThrow(() -> monitorService.copyMonitor(1L));
    }

    @Test
    void exportAll() throws Exception {
        // Create some test monitors
        Monitor monitor1 = Monitor.builder().id(1L).name("test1").app("app1").build();
        Monitor monitor2 = Monitor.builder().id(2L).name("test2").app("app2").build();
        List<Monitor> allMonitors = List.of(monitor1, monitor2);
        
        // Mock the behavior of monitorDao.findAll
        when(monitorDao.findAll()).thenReturn(allMonitors);
        
        // Create a mock HttpServletResponse
        jakarta.servlet.http.HttpServletResponse mockResponse = org.mockito.Mockito.mock(jakarta.servlet.http.HttpServletResponse.class);
        
        // Mock the ImExportService
        org.apache.hertzbeat.manager.service.ImExportService mockImExportService = org.mockito.Mockito.mock(org.apache.hertzbeat.manager.service.ImExportService.class);
        // Mock the getFileName method
        when(mockImExportService.getFileName()).thenReturn("test.json");
        // Set the field using reflection
        java.lang.reflect.Field field = MonitorServiceImpl.class.getDeclaredField("imExportServiceMap");
        field.setAccessible(true);
        java.util.Map<String, org.apache.hertzbeat.manager.service.ImExportService> imExportServiceMap = new java.util.HashMap<>();
        imExportServiceMap.put("JSON", mockImExportService);
        field.set(monitorService, imExportServiceMap);
        
        // Test the exportAll method
        assertDoesNotThrow(() -> monitorService.exportAll("JSON", mockResponse));
    }
}
