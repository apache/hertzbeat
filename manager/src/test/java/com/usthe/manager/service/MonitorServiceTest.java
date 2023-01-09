package com.usthe.manager.service;

import com.usthe.alert.calculate.CalculateAlarm;
import com.usthe.alert.dao.AlertDefineBindDao;
import com.usthe.collector.dispatch.entrance.internal.CollectJobService;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.common.entity.manager.Tag;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.dao.MonitorDao;
import com.usthe.manager.dao.ParamDao;
import com.usthe.manager.pojo.dto.AppCount;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.manager.service.impl.MonitorServiceImpl;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.manager.support.exception.MonitorMetricsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.aggregator.ArgumentsAccessor;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * newBranch feature-clickhouse#179
 * 配置带密码的clickhouse
 * https://www.cnblogs.com/it1042290135/p/16202478.html

 9363是promethus的http端口(在config.xml里面打开), http://clickhouse:9363/metrics
 docker run -d --name some-clickhouse-server -p 8123:8123 -p 9009:9009 -p 9090:9000 -p 9363:9363 --ulimit nofile=262144:262144 --volume=/opt/clickhouse/data:/var/lib/clickhouse --volume=/opt/clickhouse/log:/var/log/clickhouse-server --volume=/opt/clickhouse/conf/config.xml:/etc/clickhouse-server/config.xml --volume=/opt/clickhouse/conf/users.xml:/etc/clickhouse-server/users.xml clickhouse/clickhouse-server

 *
 * https://hub.docker.com/r/clickhouse/clickhouse-server/
 * docker run -d -p 18123:8123 -p19000:9000 --name some-clickhouse-server --ulimit nofile=262144:262144 clickhouse/clickhouse-server
 * curl 'http://localhost:18123/'
 * web UI
 * http://localhost:18123/play
 *
 * 明文密码linux可以登录了,但是navicat还是无法登录
 * clickhouse client -h 127.0.0.1 -d default -m -u default --password 123456
 * Test case for {@link MonitorService}
 * @see TagServiceTest
 */
@ExtendWith(MockitoExtension.class)
class MonitorServiceTest {

    @InjectMocks
    private MonitorServiceImpl monitorService;

    //    @Mock(lenient = true)
    @Mock
    private MonitorDao monitorDao;

    @Mock
    private ParamDao paramDao;

    @Mock
    private AppService appService;

    @Mock
    private CollectJobService collectJobService;

    @Mock
    private AlertDefineBindDao alertDefineBindDao;
    @Mock
    private CalculateAlarm calculateAlarm;

    @Mock
    Map<String, Alert> triggeredAlertMap = spy(new HashMap<>());

    /**
     * 属性无法直接mock,测试执行前-手动赋值
     */
    @BeforeEach
    public void setUp() {
        calculateAlarm.triggeredAlertMap = triggeredAlertMap;
    }

    @Test
    void detectMonitorEmpty() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .build();
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);

        List<CollectRep.MetricsData> collectRep = new ArrayList<>();
        when(collectJobService.collectSyncJobData(job)).thenReturn(collectRep);

        List<Param> params = Collections.singletonList(new Param());
        assertThrows(MonitorDetectException.class,() -> monitorService.detectMonitor(monitor,params));
    }

    /**
     * 探测失败-超时
     */
    @Test
    void detectMonitorFail() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .build();
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);

        List<CollectRep.MetricsData> collectRep = new ArrayList<>();

        CollectRep.MetricsData failCode = CollectRep.MetricsData.newBuilder()
                .setCode(CollectRep.Code.TIMEOUT).setMsg("collect timeout").build();
        collectRep.add(failCode);
        when(collectJobService.collectSyncJobData(job)).thenReturn(collectRep);

        List<Param> params = Collections.singletonList(new Param());
        assertThrows(MonitorDetectException.class,() -> monitorService.detectMonitor(monitor,params));
    }

    @Test
    void addMonitorSuccess() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectJobService.addAsyncCollectJob(job)).thenReturn(1L);
        when(monitorDao.save(monitor)).thenReturn(monitor);
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.saveAll(params)).thenReturn(params);
        assertDoesNotThrow(() -> monitorService.addMonitor(monitor,params));
    }
    @Test
    void addMonitorException() {
        Monitor monitor = Monitor.builder()
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .build();
        Job job = new Job();
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);
        when(collectJobService.addAsyncCollectJob(job)).thenReturn(1L);
        List<Param> params = Collections.singletonList(new Param());
        when(monitorDao.save(monitor)).thenThrow(RuntimeException.class);
        assertThrows(MonitorDatabaseException.class,() -> monitorService.addMonitor(monitor,params));
    }

    /**
     * 参数校验-数据库已经存在相同的监控名称
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("监控名称不能重复!",e.getMessage());
        }
    }
    /**
     * 参数校验-为必填的参数没有填
     */
    @Test
    void validateRequireMonitorParams() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .value(null)
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " is required.",e.getMessage());
        }
    }
    /**
     * 参数校验-为必填的参数类型错误
     */
    @Test
    void validateMonitorParamsType() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .value("str")
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " is invalid.",e.getMessage());
        }
    }
    /**
     * 参数校验-为必填的-整形参数范围
     */
    @Test
    void validateMonitorParamsRange() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .value("1150")
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " over range " + paramDefine.getRange(),e.getMessage());
        }
    }
    /**
     * 参数校验-为必填的-文本参数长度
     */
    @Test
    void validateMonitorParamsTextLimit() {
        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .value("1150")
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            assertEquals("Params field " + field + " type "
                    + paramDefine.getType() + " over limit " + limit,e.getMessage());
        }
    }
    /**
     * 参数校验-主机IP参数格式
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
                .value(value)
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("Params field " + field + " value " + value + " is invalid host value.",e.getMessage());
            }
        }
    }
    /**
     * 参数校验-布尔类型
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
                .value(value)
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("Params field " + field + " value "
                        + value + " is invalid boolean value.",e.getMessage());
            }
        }
    }
    /**
     * 参数校验-布尔类型
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
                .value(value)
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
        options.add(new ParamDefine.Option("language","zh"));
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("Params field " + field + " value "
                        + param.getValue() + " is invalid option value",e.getMessage());
            }
        }
    }
    /**
     * 参数校验-没有定义的类型
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
                .value(value)
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
        options.add(new ParamDefine.Option("language","zh"));
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
            monitorService.validate(dto,isModify);
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("ParamDefine type " + paramDefine.getType() + " is invalid.",e.getMessage());
            }
        }
    }

    @Test
    void modifyMonitor() {
        /**
         * 修改一个DB中不存在的的monitor
         */
        String value = "value";
        Boolean checkException = true;

        MonitorDto dto = new MonitorDto();
        List<Param> params = new ArrayList<>();
        String field = "field";
        Param param = Param.builder()
                .field(field)
                .value(value)
                .build();
        params.add(param);
        dto.setParams(params);
        long monitorId = 1L;
        Monitor monitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").host("host").id(monitorId).build();
        dto.setMonitor(monitor);
        when(monitorDao.findById(monitorId)).thenReturn(Optional.empty());
        try {
            monitorService.modifyMonitor(dto.getMonitor(),dto.getParams());
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("The Monitor " + monitorId + " not exists",e.getMessage());
            }
        }
        reset();
        /**
         * 不能修改monitor的[监控类型]
         */
        Monitor existErrorMonitor = Monitor.builder().app("app2").name("memory").host("host").id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existErrorMonitor));
        try {
            monitorService.modifyMonitor(dto.getMonitor(),dto.getParams());
        } catch (IllegalArgumentException e) {
            if (checkException){
                assertEquals("Can not modify monitor's app type",e.getMessage());
            }
        }
        reset();
        Monitor existOKMonitor = Monitor.builder().jobId(1L).intervals(1).app("app").name("memory").host("host").id(monitorId).build();
        when(monitorDao.findById(monitorId)).thenReturn(Optional.of(existOKMonitor));
        when(monitorDao.save(monitor)).thenThrow(RuntimeException.class);

        Job job = new Job();
        job.setId(2L);
        when(appService.getAppDefine(existOKMonitor.getApp())).thenReturn(job);
        assertThrows(MonitorDatabaseException.class,()->monitorService.modifyMonitor(dto.getMonitor(),dto.getParams()));
    }

    @Test
    void deleteMonitor() {
        long id = 1L;
        Monitor existOKMonitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
        when(monitorDao.findById(id)).thenReturn(Optional.of(existOKMonitor));
        doNothing().when(alertDefineBindDao).deleteAlertDefineMonitorBindsByMonitorIdEquals(id);
        assertDoesNotThrow(()-> monitorService.deleteMonitor(id));
    }

    @Test
    void deleteMonitors() {
        Set<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for(Long id : ids){
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(()-> monitorService.deleteMonitors(ids));
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
        MonitorDto monitorDto = monitorService.getMonitorDto(id);
        assertNotNull(monitorDto);
    }

    @Test
    void getMonitors() {
        Specification<Monitor> specification = mock(Specification.class);
        when(monitorDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertNotNull(monitorService.getMonitors(specification, PageRequest.of(1, 1)));
    }

    @Test
    void cancelManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for(Long id : ids){
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        assertDoesNotThrow(()-> monitorService.cancelManageMonitors(ids));
    }

    @Test
    void enableManageMonitors() {
        HashSet<Long> ids = new HashSet<>();
        ids.add(1L);
        ids.add(2L);

        List<Monitor> monitors = new ArrayList<>();
        for(Long id : ids){
            Monitor monitor = Monitor.builder().jobId(id).intervals(1).app("app").name("memory").host("host").id(id).build();
            monitor.setStatus(CommonConstants.UN_MANAGE_CODE);
            monitors.add(monitor);
        }
        when(monitorDao.findMonitorsByIdIn(ids)).thenReturn(monitors);
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitors.get(0).getApp())).thenReturn(job);
        List<Param> params = Collections.singletonList(new Param());
        when(paramDao.findParamsByMonitorId(monitors.get(0).getId())).thenReturn(params);
        assertDoesNotThrow(()-> monitorService.enableManageMonitors(ids));
    }

    @Test
    void getAllAppMonitorsCount() {

        List<AppCount> appCounts = new ArrayList<>();
        AppCount appCount = new AppCount();
        appCount.setApp("test");
        appCount.setStatus(CommonConstants.AVAILABLE_CODE);
        appCounts.add(appCount);
        when(monitorDao.findAppsStatusCount()).thenReturn(appCounts);


        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(appCounts.get(0).getApp())).thenReturn(job);

        assertDoesNotThrow(()-> monitorService.getAllAppMonitorsCount());
    }

    @Test
    void getMonitor() {
        long monitorId = 1L;
        when(monitorDao.findById(monitorId)).thenReturn(Optional.empty());
        assertDoesNotThrow(()-> monitorService.getMonitor(monitorId));
    }

    @Test
    void updateMonitorStatus() {
        assertDoesNotThrow(()-> monitorService.updateMonitorStatus(1L,CommonConstants.AVAILABLE_CODE));
    }

    @Test
    void getAppMonitors() {
        assertDoesNotThrow(()-> monitorDao.findMonitorsByAppEquals("test"));
    }

    @Test
    void addNewMonitorOptionalMetrics() {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .intervals(1)
                .name("memory")
                .app("demoApp")
                .build();
        Job job = new Job();
        job.setMetrics(new ArrayList<>());
        when(appService.getAppDefine(monitor.getApp())).thenReturn(job);

        List<Param> params = Collections.singletonList(new Param());
        List<String> metrics = Arrays.asList();
        try {
            monitorService.addNewMonitorOptionalMetrics(metrics,monitor,params);
        }catch (MonitorMetricsException e){
            assertEquals("no select metrics or select illegal metrics",e.getMessage());
        }
        reset();
        when(monitorDao.save(monitor)).thenThrow(RuntimeException.class);
        metrics = Arrays.asList("metric-001");
        List<Metrics> metricsDefine = new ArrayList<>();
        Metrics e = new Metrics();
        e.setName("metric-001");
        metricsDefine.add(e);
        job.setMetrics(metricsDefine);
        List<String> finalMetrics = metrics;
        assertThrows(MonitorDatabaseException.class,() -> monitorService.addNewMonitorOptionalMetrics(finalMetrics,monitor,params));

    }

    @Test
    void getMonitorMetrics() {
        assertDoesNotThrow(()-> appService.getAppDefineMetricNames("test"));
    }
}