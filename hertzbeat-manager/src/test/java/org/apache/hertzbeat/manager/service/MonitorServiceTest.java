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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import org.apache.hertzbeat.alert.dao.AlertDefineBindDao;
import org.apache.hertzbeat.base.dao.LabelDao;
import org.apache.hertzbeat.base.service.LabelService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.component.validator.ParamValidatorManager;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityResolutionService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorAlertBindWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorCatalogQueryService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorCatalogWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorCollectorQueryService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorCollectorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorCollectorBindWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorLabelWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorPageQueryService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorParamQueryService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorParamWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorServiceDiscoveryBindWriteModelService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorServiceDiscoveryExpansionService;
import org.apache.hertzbeat.manager.service.entity.OldMonitorStatusWriteModelService;
import org.apache.hertzbeat.manager.service.helper.MonitorImExportHelper;
import org.apache.hertzbeat.manager.service.impl.MonitorServiceImpl;
import org.apache.hertzbeat.manager.support.exception.MonitorDatabaseException;
import org.apache.hertzbeat.manager.support.exception.MonitorDetectException;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
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
import org.springframework.test.util.ReflectionTestUtils;

/**
 * newBranch feature-clickhouse#179
 * <a href="https://www.cnblogs.com/it1042290135/p/16202478.html">...</a>
 * <p>
 * <a href="http://clickhouse:9363/metrics">...</a>
 * docker run -d --name some-clickhouse-server -p 8123:8123 -p 9009:9009 -p
 * 9090:9000 -p 9363:9363
 * --ulimit nofile=262144:262144
 * --volume=/opt/clickhouse/data:/var/lib/clickhouse
 * --volume=/opt/clickhouse/log:/var/log/clickhouse-server
 * --volume=/opt/clickhouse/conf/config.xml:/etc/clickhouse-server/config.xml
 * --volume=/opt/clickhouse/conf/users.xml:/etc/clickhouse-server/users.xml
 * clickhouse/clickhouse-server
 * <p>
 * <p>
 * <a href="https://hub.docker.com/r/clickhouse/clickhouse-server/">...</a>
 * docker run -d -p 18123:8123 -p19000:9000 --name some-clickhouse-server
 * --ulimit nofile=262144:262144 clickhouse/clickhouse-server
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
    private MonitorServiceImpl monitorService;

    @Mock
    private ParamValidatorManager paramValidatorManager;

    @Mock
    private MonitorImExportHelper monitorImExportHelper;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private ParamDao paramDao;

    @Mock
    private AppService appService;

    @Mock
    private LabelService tagService;

    @Mock
    private LabelDao labelDao;

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
    private EntityMonitorBindService entityMonitorBindService;

    @Mock
    private EntityIdentityResolutionService entityIdentityResolutionService;

    @Mock
    private ApplicationContext applicationContext;

    @Mock
    private MetricsFavoriteService metricsFavoriteService;

    private OldMonitorCollectorQueryService oldMonitorCollectorQueryService;

    private OldMonitorCatalogQueryService oldMonitorCatalogQueryService;

    private OldMonitorCatalogWriteModelService oldMonitorCatalogWriteModelService;

    private OldMonitorCollectorBindWriteModelService oldMonitorCollectorBindWriteModelService;

    private OldMonitorCollectorBindQueryService oldMonitorCollectorBindQueryService;

    private OldMonitorLabelWriteModelService oldMonitorLabelWriteModelService;

    private OldMonitorPageQueryService oldMonitorPageQueryService;

    private OldMonitorParamQueryService oldMonitorParamQueryService;

    private OldMonitorParamWriteModelService oldMonitorParamWriteModelService;

    private OldMonitorServiceDiscoveryBindWriteModelService oldMonitorServiceDiscoveryBindWriteModelService;

    private OldMonitorServiceDiscoveryExpansionService oldMonitorServiceDiscoveryExpansionService;

    private OldMonitorStatusWriteModelService oldMonitorStatusWriteModelService;

    private OldMonitorAlertBindWriteModelService oldMonitorAlertBindWriteModelService;

    /**
     * Properties cannot be directly mock, test execution before - manual assignment
     */
    @BeforeEach
    public void setUp() {
        oldMonitorCatalogQueryService = new OldMonitorCatalogQueryService(monitorDao);
        oldMonitorCatalogWriteModelService = new OldMonitorCatalogWriteModelService(monitorDao);
        oldMonitorCollectorQueryService = new OldMonitorCollectorQueryService(collectorDao);
        oldMonitorCollectorBindWriteModelService = new OldMonitorCollectorBindWriteModelService(
                collectorMonitorBindDao);
        oldMonitorCollectorBindQueryService = new OldMonitorCollectorBindQueryService(collectorMonitorBindDao);
        oldMonitorLabelWriteModelService = new OldMonitorLabelWriteModelService(labelDao, tagService);
        oldMonitorPageQueryService = new OldMonitorPageQueryService(monitorDao);
        oldMonitorParamQueryService = new OldMonitorParamQueryService(paramDao);
        oldMonitorParamWriteModelService = new OldMonitorParamWriteModelService(paramDao);
        oldMonitorServiceDiscoveryBindWriteModelService = new OldMonitorServiceDiscoveryBindWriteModelService(
                monitorBindDao);
        oldMonitorServiceDiscoveryExpansionService = new OldMonitorServiceDiscoveryExpansionService(monitorBindDao);
        oldMonitorStatusWriteModelService = new OldMonitorStatusWriteModelService(monitorDao);
        oldMonitorAlertBindWriteModelService = new OldMonitorAlertBindWriteModelService(alertDefineBindDao);
        ReflectionTestUtils.setField(monitorService, "oldMonitorAlertBindWriteModelService",
                oldMonitorAlertBindWriteModelService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorCatalogQueryService",
                oldMonitorCatalogQueryService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorCatalogWriteModelService",
                oldMonitorCatalogWriteModelService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorCollectorQueryService",
                oldMonitorCollectorQueryService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorCollectorBindWriteModelService",
                oldMonitorCollectorBindWriteModelService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorCollectorBindQueryService",
                oldMonitorCollectorBindQueryService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorLabelWriteModelService",
                oldMonitorLabelWriteModelService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorPageQueryService",
                oldMonitorPageQueryService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorParamQueryService",
                oldMonitorParamQueryService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorParamWriteModelService",
                oldMonitorParamWriteModelService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorServiceDiscoveryBindWriteModelService",
                oldMonitorServiceDiscoveryBindWriteModelService);
        ReflectionTestUtils.setField(
                monitorService, "oldMonitorServiceDiscoveryExpansionService", oldMonitorServiceDiscoveryExpansionService);
        ReflectionTestUtils.setField(monitorService, "oldMonitorStatusWriteModelService",
                oldMonitorStatusWriteModelService);
        ReflectionTestUtils.setField(monitorService, "entityIdentityResolutionService",
                entityIdentityResolutionService);
    }

    private ParamDefineInfo newParamDefine(String field, String type, boolean required) {
        ParamDefineInfo paramDefine = new ParamDefineInfo();
        paramDefine.setField(field);
        paramDefine.setType(type);
        paramDefine.setRequired(required);
        return paramDefine;
    }

    @Test
    void detectMonitorEmpty() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .instance("localhost")
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
                .instance("localhost")
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
                .instance("localhost")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectJobScheduling.addAsyncCollectJob(job, null)).thenReturn(1L);
        when(monitorDao.save(monitor)).thenReturn(monitor);
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.saveAll(params)).thenReturn(params);
        assertDoesNotThrow(() -> monitorService.addMonitor(monitor, params, null, null));
        verify(entityIdentityResolutionService).refreshAutoMonitorBinds(monitor);
    }

    @Test
    void addMonitorException() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .instance("localhost")
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(2L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Monitoring name already exists!", e.getMessage());
        }
    }

    @Test
    void validateRejectsMissingPinnedCollector() {
        MonitorDto dto = new MonitorDto();
        dto.setParams(new ArrayList<>());
        dto.setCollector("collector-a");
        Monitor monitor = Monitor.builder().name("memory").instance("host").app("demoApp").id(1L).build();
        dto.setMonitor(monitor);
        when(collectorDao.findCollectorByName("collector-a")).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> monitorService.validate(dto, null));

        assertEquals("The pinned collector does not exist.", exception.getMessage());
    }

    @Test
    void validateKeepsExistingPinnedCollector() {
        MonitorDto dto = new MonitorDto();
        dto.setParams(new ArrayList<>());
        dto.setCollector("collector-a");
        Monitor monitor = Monitor.builder().name("memory").instance("host").app("demoApp").id(1L).build();
        dto.setMonitor(monitor);
        when(collectorDao.findCollectorByName("collector-a")).thenReturn(Optional.of(new Collector()));

        assertDoesNotThrow(() -> monitorService.validate(dto, null));
        assertEquals("collector-a", dto.getCollector());
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        ParamDefineInfo pd = newParamDefine(field, null, true);
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        ParamDefineInfo paramDefine = newParamDefine(field, "number", true);
        paramDefine.setRange("[0,233]");
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        doThrow(new IllegalArgumentException("Params field " + field + " type "
                + paramDefine.getType() + " is invalid.")).when(paramValidatorManager).validate(any(), any());
        try {
            monitorService.validate(dto, isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " is invalid.", e.getMessage());
        }
    }

    /**
     * Parameter verification - This parameter is mandatory. - Integer parameter
     * range
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        ParamDefineInfo paramDefine = newParamDefine(field, "number", true);
        paramDefine.setRange("[0,233]");
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        doThrow(new IllegalArgumentException("Params field " + field + " type "
                + paramDefine.getType() + " over range " + paramDefine.getRange())).when(paramValidatorManager)
                .validate(any(), any());
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        Short limit = 3;
        ParamDefineInfo paramDefine = newParamDefine(field, "text", true);
        paramDefine.setLimit(limit);
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        doThrow(new IllegalArgumentException("Params field " + field + " type "
                + paramDefine.getType() + " over limit " + limit)).when(paramValidatorManager).validate(any(), any());
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        Short limit = 3;
        ParamDefineInfo paramDefine = newParamDefine(field, "host", true);
        paramDefine.setLimit(limit);
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        if (checkException) {
            doThrow(new IllegalArgumentException(
                    "Params field " + field + " value " + value + " is invalid host value."))
                    .when(paramValidatorManager).validate(any(), any());
        }
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "boolean";
        ParamDefineInfo paramDefine = newParamDefine(field, type, true);
        paramDefine.setLimit(limit);
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        if (checkException) {
            doThrow(new IllegalArgumentException("Params field " + field + " value "
                    + value + " is invalid boolean value.")).when(paramValidatorManager).validate(any(), any());
        }
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "radio";

        List<ParamDefineInfo.OptionInfo> options = new ArrayList<>();
        options.add(new ParamDefineInfo.OptionInfo("language", "zh"));
        ParamDefineInfo paramDefine = newParamDefine(field, type, true);
        paramDefine.setLimit(limit);
        paramDefine.setOptions(options);
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        if (checkException) {
            doThrow(new IllegalArgumentException("Params field " + field + " value "
                    + param.getParamValue() + " is invalid option value")).when(paramValidatorManager)
                    .validate(any(), any());
        }
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
        Monitor monitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        dto.setMonitor(monitor);
        Boolean isModify = true;
        Monitor existMonitor = Monitor.builder().name("memory").instance("host").id(1L).build();
        when(monitorDao.findMonitorByNameEquals(monitor.getName())).thenReturn(Optional.of(existMonitor));
        List<ParamDefineInfo> paramDefines = new ArrayList<>();
        Short limit = 3;
        String type = "none";

        List<ParamDefineInfo.OptionInfo> options = new ArrayList<>();
        options.add(new ParamDefineInfo.OptionInfo("language", "zh"));
        ParamDefineInfo paramDefine = newParamDefine(field, type, true);
        paramDefine.setLimit(limit);
        paramDefine.setOptions(options);
        paramDefines.add(paramDefine);
        when(appService.getAppParamDefines(monitor.getApp())).thenReturn(paramDefines);
        if (checkException) {
            doThrow(new IllegalArgumentException("ParamDefine type " + paramDefine.getType() + " is invalid."))
                    .when(paramValidatorManager).validate(any(), any());
        }
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
        Monitor monitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").instance("host")
                .id(monitorId).build();
        dto.setMonitor(monitor);
        when(monitorDao.findById(monitorId)).thenReturn(Optional.empty());
        try {
            monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null);
        } catch (IllegalArgumentException e) {
            assertEquals("The Monitor " + monitorId + " not exists", e.getMessage());
        }
        reset();
        /*
         * The [monitoring type] of monitor cannot be modified.
         */
        Monitor existErrorMonitor = Monitor.builder().app("app2").name("memory").instance("host").id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existErrorMonitor));
        try {
            monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null);
        } catch (IllegalArgumentException e) {
            assertEquals("Can not modify monitor's app type", e.getMessage());
        }
        reset();
        Monitor existOkMonitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").instance("host")
                .id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existOkMonitor));
        when(monitorDao.save(any(Monitor.class))).thenThrow(RuntimeException.class);

        assertThrows(MonitorDatabaseException.class,
                () -> monitorService.modifyMonitor(dto.getMonitor(), dto.getParams(), null, null));
    }

    @Test
    void modifyMonitorDoesNotRunSynchronousDetectBeforeReturningSave() {
        long monitorId = 1L;
        Monitor monitor = Monitor.builder()
                .jobId(10L)
                .intervals(10)
                .app("mysql")
                .name("mysql-prod")
                .instance("127.0.0.1")
                .id(monitorId)
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        List<Param> params = new ArrayList<>();
        params.add(Param.builder().field("host").paramValue("127.0.0.1").type((byte) 1).build());
        params.add(Param.builder().field("port").paramValue("3306").type((byte) 0).build());
        Monitor existOkMonitor = Monitor.builder()
                .jobId(10L)
                .intervals(10)
                .app("mysql")
                .name("mysql-prod")
                .instance("127.0.0.1:3306")
                .id(monitorId)
                .status(CommonConstants.MONITOR_DOWN_CODE)
                .build();
        Job job = new Job();
        Metrics availableMetric = new Metrics();
        availableMetric.setPriority((byte) 0);
        job.setMetrics(List.of(availableMetric));

        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existOkMonitor));
        when(appService.getAppDefine("mysql")).thenReturn(job);
        when(collectJobScheduling.updateAsyncCollectJob(any(Job.class))).thenReturn(11L);
        lenient().doThrow(new AssertionError("save must not block on one-time detect"))
                .when(collectJobScheduling).collectSyncJobData(any(Job.class));

        assertDoesNotThrow(() -> monitorService.modifyMonitor(monitor, params, null, null));
        verify(monitorDao).save(any(Monitor.class));
        verify(paramDao).saveAll(params);
        verify(entityIdentityResolutionService).refreshAutoMonitorBinds(monitor);
    }

    @Test
    void deleteMonitor() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").instance("host").id(id)
                    .build();
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
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").instance("host").id(id)
                    .build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(() -> monitorService.deleteMonitors(ids));
        verify(entityMonitorBindService).deleteMonitorBindsByMonitorIds(ids);
    }

    @Test
    void deleteMonitorsDeleteParamsForExpandedSubMonitorIds() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);
        Set<Long> expandedIds = Set.of(1L, 2L, 3L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(ids)).thenReturn(List.of(MonitorBind.builder()
                .bizId(1L)
                .monitorId(3L)
                .build()));
        when(monitorDao.findMonitorsByIdIn(expandedIds)).thenReturn(List.of(
                Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").instance("host").id(1L).build(),
                Monitor.builder().jobId(2L).intervals(1).app("app").name("disk").instance("host").id(2L).build(),
                Monitor.builder().jobId(3L).intervals(1).app("app").name("child").instance("host").id(3L).build()));

        assertDoesNotThrow(() -> monitorService.deleteMonitors(ids));

        verify(paramDao).deleteParamsByMonitorIdIn(expandedIds);
        verify(entityMonitorBindService).deleteMonitorBindsByMonitorIds(expandedIds);
    }

    @Test
    void deleteMonitorsIgnoresNullServiceDiscoveryChildMonitorIds() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);
        Set<Long> expandedIds = Set.of(1L, 2L, 3L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(ids)).thenReturn(List.of(
                MonitorBind.builder()
                        .bizId(1L)
                        .monitorId(null)
                        .build(),
                MonitorBind.builder()
                        .bizId(2L)
                        .monitorId(3L)
                        .build()));
        when(monitorDao.findMonitorsByIdIn(expandedIds)).thenReturn(List.of(
                Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").instance("host").id(1L).build(),
                Monitor.builder().jobId(2L).intervals(1).app("app").name("disk").instance("host").id(2L).build(),
                Monitor.builder().jobId(3L).intervals(1).app("app").name("child").instance("host").id(3L).build()));

        assertDoesNotThrow(() -> monitorService.deleteMonitors(ids));

        verify(monitorDao).findMonitorsByIdIn(expandedIds);
        verify(paramDao).deleteParamsByMonitorIdIn(expandedIds);
        verify(entityMonitorBindService).deleteMonitorBindsByMonitorIds(expandedIds);
    }

    @Test
    void deleteMonitorsIgnoresNullSubmittedMonitorIds() {
        Set<Long> submittedIds = new HashSet<>();
        submittedIds.add(null);
        submittedIds.add(1L);
        Set<Long> sanitizedIds = Set.of(1L);
        Set<Long> expandedIds = Set.of(1L, 3L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(sanitizedIds)).thenReturn(List.of(MonitorBind.builder()
                .bizId(1L)
                .monitorId(3L)
                .build()));
        when(monitorDao.findMonitorsByIdIn(expandedIds)).thenReturn(List.of(
                Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").instance("host").id(1L).build(),
                Monitor.builder().jobId(3L).intervals(1).app("app").name("child").instance("host").id(3L).build()));

        assertDoesNotThrow(() -> monitorService.deleteMonitors(submittedIds));

        verify(monitorBindDao).findMonitorBindsByBizIdIn(sanitizedIds);
        verify(monitorDao).findMonitorsByIdIn(expandedIds);
        verify(paramDao).deleteParamsByMonitorIdIn(expandedIds);
        verify(entityMonitorBindService).deleteMonitorBindsByMonitorIds(expandedIds);
    }

    @Test
    void getMonitorDto() {
        long id = 1L;
        Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").instance("host").id(id)
                .build();
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
        when(monitorDao.findAll(any(Specification.class), any(PageRequest.class))).thenAnswer((invocation) -> {
            Specification<Monitor> spec = invocation.getArgument(0);
            CriteriaBuilder cb = mock(CriteriaBuilder.class);
            CriteriaQuery<?> query = mock(CriteriaQuery.class);
            Root<Monitor> root = mock(Root.class);
            spec.toPredicate(root, query, cb);
            return Page.empty();
        });
        assertNotNull(monitorService.getMonitors(null, null, "9.111", null, "gmtCreate", "desc", 1, 1, null));
        assertNotNull(monitorService.getMonitors(null, null, "9", null, "gmtCreate", "desc", 1, 1, null));
    }

    @Test
    @SuppressWarnings("unchecked")
    void getMonitorsTreatsEqualsLabelFilterAsKeyValuePair() {
        when(monitorDao.findAll(any(Specification.class), any(PageRequest.class))).thenAnswer((invocation) -> {
            Specification<Monitor> spec = invocation.getArgument(0);
            CriteriaBuilder cb = mock(CriteriaBuilder.class);
            CriteriaQuery<?> query = mock(CriteriaQuery.class);
            Root<Monitor> root = mock(Root.class);
            Path<String> labelsPath = mock(Path.class);
            when(root.<String>get("labels")).thenReturn(labelsPath);

            spec.toPredicate(root, query, cb);

            verify(cb).like(labelsPath, "%\"team\":\"platform\"%");
            return Page.empty();
        });

        assertNotNull(monitorService.getMonitors(
                null, null, null, null, "gmtCreate", "desc", 1, 1, "team=platform"));
    }

    @Test
    void cancelManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").instance("host").id(id)
                    .build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(() -> monitorService.cancelManageMonitors(ids));
    }

    @Test
    void cancelManageMonitorsExpandsSubMonitorsWithoutMutatingSubmittedIds() {
        Set<Long> submittedIds = Set.of(1L, 2L);
        Set<Long> expandedIds = Set.of(1L, 2L, 3L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(submittedIds)).thenReturn(List.of(MonitorBind.builder()
                .bizId(1L)
                .monitorId(3L)
                .build()));
        when(monitorDao.findMonitorsByIdIn(expandedIds)).thenReturn(List.of(
                Monitor.builder().jobId(1L).status(CommonConstants.MONITOR_PAUSED_CODE).id(1L).build(),
                Monitor.builder().jobId(2L).status(CommonConstants.MONITOR_PAUSED_CODE).id(2L).build(),
                Monitor.builder().jobId(3L).status(CommonConstants.MONITOR_PAUSED_CODE).id(3L).build()));

        assertDoesNotThrow(() -> monitorService.cancelManageMonitors(submittedIds));

        assertEquals(Set.of(1L, 2L), submittedIds);
        verify(monitorDao).findMonitorsByIdIn(expandedIds);
    }

    @Test
    void enableManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for (Long id : ids) {
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").instance("host").id(id)
                    .build();
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
    void enableManageMonitorsExpandsSubMonitorsWithoutMutatingSubmittedIds() {
        Set<Long> submittedIds = Set.of(1L, 2L);
        Set<Long> expandedIds = Set.of(1L, 2L, 3L);
        when(monitorBindDao.findMonitorBindsByBizIdIn(submittedIds)).thenReturn(List.of(MonitorBind.builder()
                .bizId(1L)
                .monitorId(3L)
                .build()));
        when(monitorDao.findMonitorsByIdIn(expandedIds)).thenReturn(List.of(
                Monitor.builder().jobId(1L).status(CommonConstants.MONITOR_UP_CODE).id(1L).build(),
                Monitor.builder().jobId(2L).status(CommonConstants.MONITOR_UP_CODE).id(2L).build(),
                Monitor.builder().jobId(3L).status(CommonConstants.MONITOR_UP_CODE).id(3L).build()));

        assertDoesNotThrow(() -> monitorService.enableManageMonitors(submittedIds));

        assertEquals(Set.of(1L, 2L), submittedIds);
        verify(monitorDao).findMonitorsByIdIn(expandedIds);
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
        when(monitorDao.findMonitorsByAppEquals("test")).thenReturn(List.of());

        assertDoesNotThrow(() -> monitorService.getAppMonitors("test"));
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
                .instance("localhost")
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
        jakarta.servlet.http.HttpServletResponse mockResponse = org.mockito.Mockito
                .mock(jakarta.servlet.http.HttpServletResponse.class);

        // Test the exportAll method
        assertDoesNotThrow(() -> monitorService.exportAll("JSON", mockResponse));
        verify(monitorImExportHelper).export(List.of(1L, 2L), "JSON", mockResponse);
    }

    @Test
    void jexlKeyword() {

        List<Metrics.Field> fields = new ArrayList<>();
        fields.add(Metrics.Field.builder().field("size").build());

        List<Metrics> metrics = new ArrayList<>();
        metrics.add(Metrics.builder().name("metricsName").fields(fields).build());

        Job job = new Job();
        job.setApp("testJob");
        job.setMetrics(metrics);
        Monitor monitor = Monitor.builder().jobId(1L).intervals(1).app(job.getApp()).name(job.getApp()).instance("host")
                .build();

        List<Param> params = new ArrayList<>();
        params.add(Param.builder().field("field").paramValue("value").build());

        MonitorDto dto = new MonitorDto();
        dto.setMonitor(monitor);
        dto.setParams(params);

        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> monitorService.validate(dto, null));
        assertEquals("testJob metricsName size prohibited keywords, please modify the template information.",
                exception.getMessage());
    }
}
