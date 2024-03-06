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

package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.alert.dao.AlertDefineBindDao;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.dromara.hertzbeat.common.entity.manager.Tag;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.dromara.hertzbeat.common.util.*;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.dao.TagMonitorBindDao;
import org.dromara.hertzbeat.manager.pojo.dto.AppCount;
import org.dromara.hertzbeat.manager.pojo.dto.MonitorDto;
import org.dromara.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.dromara.hertzbeat.manager.service.AppService;
import org.dromara.hertzbeat.manager.service.ImExportService;
import org.dromara.hertzbeat.manager.service.MonitorService;
import org.dromara.hertzbeat.manager.service.TagService;
import org.dromara.hertzbeat.manager.support.exception.MonitorDatabaseException;
import org.dromara.hertzbeat.manager.support.exception.MonitorDetectException;
import org.dromara.hertzbeat.manager.support.exception.MonitorMetricsException;
import org.dromara.hertzbeat.warehouse.service.WarehouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 监控管理服务实现
 *
 * @author tomsun28
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class MonitorServiceImpl implements MonitorService {
    private static final Long MONITOR_ID_TMP = 1000000000L;

    public static final String HTTP = "http://";
    public static final String HTTPS = "https://";
    public static final String BLANK = "";
    public static final String PATTERN_HTTP = "(?i)http://";
    public static final String PATTERN_HTTPS = "(?i)https://";

    @Autowired
    private AppService appService;

    @Autowired
    private TagService tagService;

    @Autowired
    private CollectJobScheduling collectJobScheduling;

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

    @Autowired
    private CollectorDao collectorDao;

    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Autowired
    private TagMonitorBindDao tagMonitorBindDao;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private WarehouseService warehouseService;

    private final Map<String, ImExportService> imExportServiceMap = new HashMap<>();

    public MonitorServiceImpl(List<ImExportService> imExportServiceList) {
        imExportServiceList.forEach(it -> imExportServiceMap.put(it.type(), it));
    }

    @Override
    @Transactional(readOnly = true)
    public void detectMonitor(Monitor monitor, List<Param> params, String collector) throws MonitorDetectException {
        Long monitorId = monitor.getId();
        if (monitorId == null || monitorId == 0) {
            monitorId = MONITOR_ID_TMP;
        }
        Job appDefine = appService.getAppDefine(monitor.getApp());
        if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
            appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
        }
        appDefine.setMonitorId(monitorId);
        appDefine.setCyclic(false);
        appDefine.setTimestamp(System.currentTimeMillis());
        List<Configmap> configmaps = params.stream().map(param ->
                new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);
        // To detect availability, you only need to collect the set of availability metrics with a priority of 0.
        List<Metrics> availableMetrics = appDefine.getMetrics().stream()
                .filter(item -> item.getPriority() == 0).collect(Collectors.toList());
        appDefine.setMetrics(availableMetrics);
        List<CollectRep.MetricsData> collectRep;
        if (collector != null) {
            collectRep = collectJobScheduling.collectSyncJobData(appDefine, collector);
        } else {
            collectRep = collectJobScheduling.collectSyncJobData(appDefine);
        }
        // If the detection result fails, a detection exception is thrown
        if (collectRep == null || collectRep.isEmpty()) {
            throw new MonitorDetectException("Collect Timeout No Response");
        }
        if (collectRep.get(0).getCode() != CollectRep.Code.SUCCESS) {
            throw new MonitorDetectException(collectRep.get(0).getMsg());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addMonitor(Monitor monitor, List<Param> params, String collector) throws RuntimeException {
        // Apply for monitor id
        long monitorId = SnowFlakeIdGenerator.generateId();
        // Init Set Default Tags: monitorId monitorName app
        List<Tag> tags = monitor.getTags();
        if (tags == null) {
            tags = new LinkedList<>();
            monitor.setTags(tags);
        }
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_ID).value(String.valueOf(monitorId)).type((byte) 0).build());
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_NAME).value(String.valueOf(monitor.getName())).type((byte) 0).build());
        // Construct the collection task Job entity     
        Job appDefine = appService.getAppDefine(monitor.getApp());
        if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
            appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
        }
        appDefine.setMonitorId(monitorId);
        appDefine.setInterval(monitor.getIntervals());
        appDefine.setCyclic(true);
        appDefine.setTimestamp(System.currentTimeMillis());
        List<Configmap> configmaps = params.stream().map(param -> {
            param.setMonitorId(monitorId);
            return new Configmap(param.getField(), param.getValue(), param.getType());
        }).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);

        long jobId = collector == null ? collectJobScheduling.addAsyncCollectJob(appDefine, null) :
                collectJobScheduling.addAsyncCollectJob(appDefine, collector);

        try {
            if (collector != null) {
                CollectorMonitorBind collectorMonitorBind = CollectorMonitorBind.builder()
                        .collector(collector)
                        .monitorId(monitorId)
                        .build();
                collectorMonitorBindDao.save(collectorMonitorBind);
            }
            monitor.setId(monitorId);
            monitor.setJobId(jobId);
            monitor.setStatus(CommonConstants.AVAILABLE_CODE);
            monitorDao.save(monitor);
            paramDao.saveAll(params);
        } catch (Exception e) {
            log.error("Error while adding monitor: {}", e.getMessage(), e);
            collectJobScheduling.cancelAsyncCollectJob(jobId);
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    public void addNewMonitorOptionalMetrics(List<String> metrics, Monitor monitor, List<Param> params) {
        long monitorId = SnowFlakeIdGenerator.generateId();
        List<Tag> tags = monitor.getTags();
        if (tags == null) {
            tags = new LinkedList<>();
            monitor.setTags(tags);
        }
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_ID).value(String.valueOf(monitorId)).type((byte) 0).build());
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_NAME).value(String.valueOf(monitor.getName())).type((byte) 0).build());
        Job appDefine = appService.getAppDefine(monitor.getApp());
        //设置用户可选指标
        List<Metrics> metricsDefine = appDefine.getMetrics();
        Set<String> metricsDefineNamesSet = metricsDefine.stream()
                .map(Metrics::getName)
                .collect(Collectors.toSet());
        if (CollectionUtils.isEmpty(metrics) || !metricsDefineNamesSet.containsAll(metrics)) {
            throw new MonitorMetricsException("no select metrics or select illegal metrics");
        }

        List<Metrics> realMetrics = metricsDefine.stream().filter(m -> metrics.contains(m.getName())).collect(Collectors.toList());
        appDefine.setMetrics(realMetrics);
        appDefine.setMonitorId(monitorId);
        appDefine.setInterval(monitor.getIntervals());
        appDefine.setCyclic(true);
        appDefine.setTimestamp(System.currentTimeMillis());
        List<Configmap> configmaps = params.stream().map(param -> {
            param.setMonitorId(monitorId);
            return new Configmap(param.getField(), param.getValue(), param.getType());
        }).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);
        // Send the collection task to get the job ID
        // 下发采集任务得到jobId
        long jobId = collectJobScheduling.addAsyncCollectJob(appDefine, null);
        // Brush the library after the download is successful
        // 下发成功后刷库
        try {
            monitor.setId(monitorId);
            monitor.setJobId(jobId);
            monitor.setStatus(CommonConstants.AVAILABLE_CODE);
            monitorDao.save(monitor);
            paramDao.saveAll(params);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // Repository brushing abnormally cancels the previously delivered task
            // 刷库异常取消之前的下发任务
            collectJobScheduling.cancelAsyncCollectJob(jobId);
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    public List<String> getMonitorMetrics(String app) {
        return appService.getAppDefineMetricNames(app);
    }

    @Override
    public void export(List<Long> ids, String type, HttpServletResponse res) throws Exception {
        var imExportService = imExportServiceMap.get(type);
        if (imExportService == null) {
            throw new IllegalArgumentException("not support export type: " + type);
        }
        var fileName = imExportService.getFileName();
        res.setHeader("content-type", "application/octet-stream;charset=UTF-8");
        res.setContentType("application/octet-stream;charset=UTF-8");
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=" + URLEncoder.encode(fileName, StandardCharsets.UTF_8));
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        imExportService.exportConfig(res.getOutputStream(), ids);
    }

    @Override
    public void importConfig(MultipartFile file) throws Exception {
        var fileName = file.getOriginalFilename();
        if (!StringUtils.hasText(fileName)) {
            return;
        }
        var type = "";
        if (fileName.toLowerCase().endsWith(JsonImExportServiceImpl.FILE_SUFFIX)) {
            type = JsonImExportServiceImpl.TYPE;
        }
        if (fileName.toLowerCase().endsWith(ExcelImExportServiceImpl.FILE_SUFFIX)) {
            type = ExcelImExportServiceImpl.TYPE;
        }
        if (fileName.toLowerCase().endsWith(YamlImExportServiceImpl.FILE_SUFFIX)) {
            type = YamlImExportServiceImpl.TYPE;
        }
        if (!imExportServiceMap.containsKey(type)) {
            throw new RuntimeException("file " + fileName + " is not supported.");
        }
        var imExportService = imExportServiceMap.get(type);
        imExportService.importConfig(file.getInputStream());
    }


    @Override
    @Transactional(readOnly = true)
    public void validate(MonitorDto monitorDto, Boolean isModify) throws IllegalArgumentException {
        // The request monitoring parameter matches the monitoring parameter definition mapping check
        // 请求监控参数与监控参数定义映射校验匹配
        Monitor monitor = monitorDto.getMonitor();
        monitor.setHost(monitor.getHost().trim());
        monitor.setName(monitor.getName().trim());
        Map<String, Param> paramMap = monitorDto.getParams()
                .stream()
                .peek(param -> {
                    param.setMonitorId(monitor.getId());
                    String value = param.getValue() == null ? null : param.getValue().trim();
                    param.setValue(value);
                })
                .collect(Collectors.toMap(Param::getField, param -> param));
        // Check name uniqueness and can not equal app type    
        if (isModify != null) {
            Optional<Job> defineOptional = appService.getAppDefineOption(monitor.getName());
            if (defineOptional.isPresent()) {
                throw new IllegalArgumentException("Monitoring name cannot be the existed monitoring type name!");
            }
            Optional<Monitor> monitorOptional = monitorDao.findMonitorByNameEquals(monitor.getName());
            if (monitorOptional.isPresent()) {
                Monitor existMonitor = monitorOptional.get();
                if (isModify) {
                    if (!existMonitor.getId().equals(monitor.getId())) {
                        throw new IllegalArgumentException("Monitoring name already exists!");
                    }
                } else {
                    throw new IllegalArgumentException("Monitoring name already exists!");
                }
            }
        }
        if (monitor.getTags() != null) {
            monitor.setTags(monitor.getTags().stream().distinct().collect(Collectors.toList()));
        }
        // the dispatch collector must exist if pin
        if (StringUtils.hasText(monitorDto.getCollector())) {
            Optional<Collector> optionalCollector = collectorDao.findCollectorByName(monitorDto.getCollector());
            if (optionalCollector.isEmpty()) {
                throw new IllegalArgumentException("The pinned collector does not exist.");
            }
        } else {
            monitorDto.setCollector(null);
        }
        // Parameter definition structure verification  参数定义结构校验
        List<ParamDefine> paramDefines = appService.getAppParamDefines(monitorDto.getMonitor().getApp());
        if (paramDefines != null) {
            for (ParamDefine paramDefine : paramDefines) {
                String field = paramDefine.getField();
                Param param = paramMap.get(field);
                if (paramDefine.isRequired() && (param == null || param.getValue() == null)) {
                    throw new IllegalArgumentException("Params field " + field + " is required.");
                }
                if (param != null && param.getValue() != null && !"".equals(param.getValue())) {
                    switch (paramDefine.getType()) {
                        case "number":
                            double doubleValue;
                            try {
                                doubleValue = Double.parseDouble(param.getValue());
                            } catch (Exception e) {
                                throw new IllegalArgumentException("Params field " + field + " type "
                                        + paramDefine.getType() + " is invalid.");
                            }
                            if (paramDefine.getRange() != null) {
                                if (!IntervalExpressionUtil.validNumberIntervalExpress(doubleValue,
                                        paramDefine.getRange())) {
                                    throw new IllegalArgumentException("Params field " + field + " type "
                                            + paramDefine.getType() + " over range " + paramDefine.getRange());
                                }
                            }
                            param.setType(CommonConstants.PARAM_TYPE_NUMBER);
                            break;
                        case "textarea":
                            Short textareaLimit = paramDefine.getLimit();
                            if (textareaLimit != null && param.getValue().length() > textareaLimit) {
                                throw new IllegalArgumentException("Params field " + field + " type "
                                        + paramDefine.getType() + " over limit " + param.getValue());
                            }
                            break;
                        case "text":
                            Short textLimit = paramDefine.getLimit();
                            if (textLimit != null && param.getValue().length() > textLimit) {
                                throw new IllegalArgumentException("Params field " + field + " type "
                                        + paramDefine.getType() + " over limit " + textLimit);
                            }
                            break;
                        case "host":
                            String hostValue = param.getValue();
                            if (hostValue.toLowerCase().contains(HTTP)) {
                                hostValue = hostValue.replaceAll(PATTERN_HTTP, BLANK);
                            }
                            if (hostValue.toLowerCase().contains(HTTPS)) {
                                hostValue = hostValue.replace(PATTERN_HTTPS, BLANK);
                            }
                            if (!IpDomainUtil.validateIpDomain(hostValue)) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + hostValue + " is invalid host value.");
                            }
                            break;
                        case "password":
                            // The plaintext password needs to be encrypted for transmission and storage
                            // 明文密码需加密传输存储
                            String passwordValue = param.getValue();
                            if (!AesUtil.isCiphertext(passwordValue)) {
                                passwordValue = AesUtil.aesEncode(passwordValue);
                                param.setValue(passwordValue);
                            }
                            param.setType(CommonConstants.PARAM_TYPE_PASSWORD);
                            break;
                        case "boolean":
                            // boolean check
                            String booleanValue = param.getValue();
                            if (!"true".equalsIgnoreCase(booleanValue) && !"false".equalsIgnoreCase(booleanValue)) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + booleanValue + " is invalid boolean value.");
                            }
                            break;
                        case "radio":
                            // radio single value check  radio单选值校验
                            List<ParamDefine.Option> options = paramDefine.getOptions();
                            boolean invalid = true;
                            if (options != null) {
                                for (ParamDefine.Option option : options) {
                                    if (param.getValue().equalsIgnoreCase(option.getValue())) {
                                        invalid = false;
                                        break;
                                    }
                                }
                            }
                            if (invalid) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getValue() + " is invalid option value");
                            }
                            break;
                        case "checkbox":
                            List<ParamDefine.Option> checkboxOptions = paramDefine.getOptions();
                            boolean checkboxInvalid = true;
                            if (checkboxOptions != null) {
                                for (ParamDefine.Option option : checkboxOptions) {
                                    if (param.getValue().equalsIgnoreCase(option.getValue())) {
                                        checkboxInvalid = false;
                                        break;
                                    }
                                }
                            }
                            if (checkboxInvalid) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getValue() + " is invalid checkbox value");
                            }
                            break;
                        case "metrics-field":
                        case "key-value":
                            if (JsonUtil.fromJson(param.getValue(), new TypeReference<>() {
                            }) == null) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getValue() + " is invalid key-value value");
                            }
                            break;
                        case "array":
                            String[] arrays = param.getValue().split(",");
                            if (arrays.length == 0) {
                                throw new IllegalArgumentException("Param field" + field + " value "
                                        + param.getValue() + " is invalid arrays value");
                            }
                            if (param.getValue().startsWith("[") && param.getValue().endsWith("]")) {
                                param.setValue(param.getValue().substring(1, param.getValue().length() - 1));
                            }
                            break;
                        // todo More parameter definitions and actual value format verification
                        // 更多参数定义与实际值格式校验
                        default:
                            throw new IllegalArgumentException("ParamDefine type " + paramDefine.getType() + " is invalid.");
                    }
                }
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void modifyMonitor(Monitor monitor, List<Param> params, String collector) throws RuntimeException {
        long monitorId = monitor.getId();
        // Check to determine whether the monitor corresponding to the monitor id exists
        // 查判断monitorId对应的此监控是否存在
        Optional<Monitor> queryOption = monitorDao.findById(monitorId);
        if (queryOption.isEmpty()) {
            throw new IllegalArgumentException("The Monitor " + monitorId + " not exists");
        }
        Monitor preMonitor = queryOption.get();
        if (!preMonitor.getApp().equals(monitor.getApp())) {
            // The type of monitoring cannot be modified
            // 监控的类型不能修改
            throw new IllegalArgumentException("Can not modify monitor's app type");
        }
        // Auto Update Default Tags: monitorName
        // 自动更新默认的Tag： 监控名字
        List<Tag> tags = monitor.getTags();
        if (tags == null) {
            tags = new LinkedList<>();
            monitor.setTags(tags);
        }
        for (Tag tag : tags) {
            if (CommonConstants.TAG_MONITOR_NAME.equals(tag.getName())) {
                tag.setValue(monitor.getName());
            }
        }
        if (preMonitor.getStatus() != CommonConstants.UN_MANAGE_CODE) {
            // Construct the collection task Job entity
            // 构造采集任务Job实体
            Job appDefine = appService.getAppDefine(monitor.getApp());
            if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
            }
            appDefine.setId(preMonitor.getJobId());
            appDefine.setMonitorId(monitorId);
            appDefine.setInterval(monitor.getIntervals());
            appDefine.setCyclic(true);
            appDefine.setTimestamp(System.currentTimeMillis());
            if (params != null) {
                List<Configmap> configmaps = params.stream().map(param ->
                        new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
                appDefine.setConfigmap(configmaps);
            }
            long newJobId;
            if (collector == null) {
                newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine);
            } else {
                newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine, collector);
            }
            monitor.setJobId(newJobId);
        }
        // After the update is successfully released, refresh the database
        // 下发更新成功后刷库
        try {
            collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(monitorId);
            if (collector != null) {
                CollectorMonitorBind collectorMonitorBind = CollectorMonitorBind.builder()
                        .collector(collector).monitorId(monitorId)
                        .build();
                collectorMonitorBindDao.save(collectorMonitorBind);
            }
            monitor.setStatus(preMonitor.getStatus());
            // force update gmtUpdate time, due the case: monitor not change, param change. we also think monitor change
            monitor.setGmtUpdate(LocalDateTime.now());
            monitorDao.save(monitor);
            if (params != null) {
                paramDao.saveAll(params);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // Repository brushing abnormally cancels the previously delivered task
            // 刷库异常取消之前的下发任务
            collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitor(long id) throws RuntimeException {
        Optional<Monitor> monitorOptional = monitorDao.findById(id);
        if (monitorOptional.isPresent()) {
            Monitor monitor = monitorOptional.get();
            monitorDao.deleteById(id);
            // delete tag 删除监控对应的标签
            tagService.deleteMonitorSystemTags(monitor);
            paramDao.deleteParamsByMonitorId(id);
            tagMonitorBindDao.deleteTagMonitorBindsByMonitorId(id);
            alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdEquals(id);
            collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(id);
            collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            applicationContext.publishEvent(new MonitorDeletedEvent(applicationContext, monitor.getId()));
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitors(Set<Long> ids) throws RuntimeException {
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        if (monitors != null) {
            monitorDao.deleteAll(monitors);
            paramDao.deleteParamsByMonitorIdIn(ids);
            Set<Long> monitorIds = monitors.stream().map(Monitor::getId).collect(Collectors.toSet());
            tagMonitorBindDao.deleteTagMonitorBindsByMonitorIdIn(monitorIds);
            alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdIn(monitorIds);
            for (Monitor monitor : monitors) {
                // delete tag 删除监控对应的标签
                tagService.deleteMonitorSystemTags(monitor);
                collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(monitor.getId());
                collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
                applicationContext.publishEvent(new MonitorDeletedEvent(applicationContext, monitor.getId()));
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MonitorDto getMonitorDto(long id) throws RuntimeException {
        Optional<Monitor> monitorOptional = monitorDao.findById(id);
        if (monitorOptional.isPresent()) {
            Monitor monitor = monitorOptional.get();
            MonitorDto monitorDto = new MonitorDto();
            monitorDto.setMonitor(monitor);
            List<Param> params = paramDao.findParamsByMonitorId(id);
            monitorDto.setParams(params);
            if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(monitor.getApp())) {
                List<CollectRep.MetricsData> metricsDataList = warehouseService.queryMonitorMetricsData(id);
                List<String> metrics = metricsDataList.stream().map(CollectRep.MetricsData::getMetrics).collect(Collectors.toList());
                monitorDto.setMetrics(metrics);
            } else {
                Job job = appService.getAppDefine(monitor.getApp());
                List<String> metrics = job.getMetrics().stream()
                        .filter(Metrics::isVisible)
                        .map(Metrics::getName).collect(Collectors.toList());
                monitorDto.setMetrics(metrics);   
            }
            Optional<CollectorMonitorBind> bindOptional = collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitor.getId());
            bindOptional.ifPresent(bind -> monitorDto.setCollector(bind.getCollector()));
            return monitorDto;
        } else {
            return null;
        }
    }

    @Override
    public Page<Monitor> getMonitors(Specification<Monitor> specification, PageRequest pageRequest) {
        return monitorDao.findAll(specification, pageRequest);
    }

    @Override
    public void cancelManageMonitors(HashSet<Long> ids) {
        // Update monitoring status Delete corresponding monitoring periodic task
        // 更新任务状态  删除对应的监控周期性任务
        // The jobId is not deleted, and the jobId is reused again after the management is started.
        // jobId不删除 待启动纳管之后再次复用jobId
        List<Monitor> managedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() != CommonConstants.UN_MANAGE_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.UN_MANAGE_CODE))
                .collect(Collectors.toList());
        if (!managedMonitors.isEmpty()) {
            for (Monitor monitor : managedMonitors) {
                collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            }
            monitorDao.saveAll(managedMonitors);
        }
    }

    @Override
    public void enableManageMonitors(HashSet<Long> ids) {
        // Update monitoring status Add corresponding monitoring periodic task
        // 更新任务状态 新增对应的监控周期性任务
        List<Monitor> unManagedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() == CommonConstants.UN_MANAGE_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.AVAILABLE_CODE))
                .collect(Collectors.toList());
        if (!unManagedMonitors.isEmpty()) {
            for (Monitor monitor : unManagedMonitors) {
                // Construct the collection task Job entity
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                    appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                }
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param ->
                        new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
                List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.hasText(item.getDefaultValue()))
                        .collect(Collectors.toList());
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
                        configmaps.add(configmap);
                    }
                });
                appDefine.setConfigmap(configmaps);
                // Issue collection tasks       下发采集任务
                Optional<CollectorMonitorBind> bindOptional =
                        collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitor.getId());
                long newJobId = bindOptional.map(bind ->
                                collectJobScheduling.addAsyncCollectJob(appDefine, bind.getCollector()))
                        .orElseGet(() -> collectJobScheduling.addAsyncCollectJob(appDefine, null));
                monitor.setJobId(newJobId);
                applicationContext.publishEvent(new MonitorDeletedEvent(applicationContext, monitor.getId()));
            }
            monitorDao.saveAll(unManagedMonitors);
        }
    }

    @Override
    public List<AppCount> getAllAppMonitorsCount() {
        List<AppCount> appCounts = monitorDao.findAppsStatusCount();
        if (appCounts == null) {
            return null;
        }
        //Statistical category information, calculate the number of corresponding states for each monitor
        //统计类别信息，计算每个监控分别对应状态的数量
        Map<String, AppCount> appCountMap = new HashMap<>(appCounts.size());
        for (AppCount item : appCounts) {
            AppCount appCount = appCountMap.getOrDefault(item.getApp(), new AppCount());
            appCount.setApp(item.getApp());
            switch (item.getStatus()) {
                case CommonConstants.AVAILABLE_CODE:
                    appCount.setAvailableSize(appCount.getAvailableSize() + item.getSize());
                    break;
                case CommonConstants.UN_AVAILABLE_CODE:
                    appCount.setUnAvailableSize(appCount.getUnAvailableSize() + item.getSize());
                    break;
                case CommonConstants.UN_MANAGE_CODE:
                    appCount.setUnManageSize(appCount.getUnManageSize() + item.getSize());
                    break;
                default:
                    break;
            }
            appCountMap.put(item.getApp(), appCount);
        }
        //Traverse the map obtained by statistics and convert it into a List<App Count> result set
        //遍历统计得到的map，转换成List<App Count>结果集
        return appCountMap.values().stream().map(item -> {
            item.setSize(item.getAvailableSize() + item.getUnManageSize() + item.getUnAvailableSize());
            try {
                Job job = appService.getAppDefine(item.getApp());
                item.setCategory(job.getCategory());
            } catch (Exception ignored) {
                return null;
            }
            return item;
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void copyMonitors(List<Long> ids) {

        ids.stream().parallel().forEach(id -> {
            // get monitor and Params according id
            Optional<Monitor> monitorOpt = monitorDao.findById(id);
            List<Param> params = paramDao.findParamsByMonitorId(id);

            monitorOpt.ifPresentOrElse(monitor -> {
                // deep copy original monitor to achieve persist in JPA
                Monitor newMonitor = JsonUtil.fromJson(JsonUtil.toJson(monitor), Monitor.class);
                if (newMonitor != null) {
                    copyMonitor(newMonitor, params);   
                }
            }, () -> log.warn("can not find the monitor for id ：{}", id));
        });
    }

    @Override
    public void updateAppCollectJob(Job job) {
        List<Monitor> monitors = monitorDao.findMonitorsByAppEquals(job.getApp())
                .stream().filter(monitor -> monitor.getStatus() != CommonConstants.UN_MANAGE_CODE)
                .collect(Collectors.toList());
        List<CollectorMonitorBind> monitorBinds = collectorMonitorBindDao.findCollectorMonitorBindsByMonitorIdIn(
                monitors.stream().map(Monitor::getId).collect(Collectors.toSet()));
        Map<Long, String> monitorIdCollectorMap = monitorBinds.stream().collect(
                Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));
        for (Monitor monitor : monitors) {
            try {
                Job appDefine = job.clone();
                if (monitor == null || appDefine == null || monitor.getId() == null || monitor.getJobId() == null) {
                    log.error("update monitor job error when template modify, define | id | jobId is null. continue");
                    continue;
                }
                if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                    appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
                }
                appDefine.setId(monitor.getJobId());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param -> new Configmap(param.getField(),
                        param.getValue(), param.getType())).collect(Collectors.toList());
                List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.hasText(item.getDefaultValue()))
                        .collect(Collectors.toList());
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
                        configmaps.add(configmap);
                    }
                });
                appDefine.setConfigmap(configmaps);
                // if is pinned collector
                String collector = monitorIdCollectorMap.get(monitor.getId());
                // 下发采集任务
                long newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine, collector);
                monitor.setJobId(newJobId);
                monitorDao.save(monitor);   
            } catch (Exception e) {
                log.error("update monitor job error when template modify: {}.continue", e.getMessage(), e);
            }
        }
    }

    @Override
    public Monitor getMonitor(Long monitorId) {
        return monitorDao.findById(monitorId).orElse(null);
    }

    @Override
    public void updateMonitorStatus(Long monitorId, byte status) {
        monitorDao.updateMonitorStatus(monitorId, status);
    }

    @Override
    public List<Monitor> getAppMonitors(String app) {
        return monitorDao.findMonitorsByAppEquals(app);
    }

    private void copyMonitor(Monitor monitor, List<Param> params) {
        List<Tag> oldTags = monitor.getTags();
        List<Tag> newTags = filterTags(oldTags);

        monitor.setTags(newTags);

        monitor.setName(String.format("%s - copy", monitor.getName()));
        addMonitor(monitor, params, null);
    }

    private List<Tag> filterTags(List<Tag> tags) {
        if (tags == null || tags.isEmpty()) {
            return new LinkedList<>();
        }
        return tags.stream()
                .filter(tag -> !(tag.getName().equals(CommonConstants.TAG_MONITOR_ID) || tag.getName().equals(CommonConstants.TAG_MONITOR_NAME)))
                .collect(Collectors.toList());
    }
}
