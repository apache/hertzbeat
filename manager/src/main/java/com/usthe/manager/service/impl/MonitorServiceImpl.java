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

package com.usthe.manager.service.impl;

import com.usthe.alert.calculate.CalculateAlarm;
import com.usthe.alert.dao.AlertDefineBindDao;
import com.usthe.collector.dispatch.entrance.internal.CollectJobService;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.manager.Tag;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.AesUtil;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.IntervalExpressionUtil;
import com.usthe.common.util.IpDomainUtil;
import com.usthe.common.util.SnowFlakeIdGenerator;
import com.usthe.manager.dao.MonitorDao;
import com.usthe.manager.dao.ParamDao;
import com.usthe.manager.pojo.dto.AppCount;
import com.usthe.manager.pojo.dto.MonitorDto;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.manager.service.AppService;
import com.usthe.manager.service.MonitorService;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.manager.support.exception.MonitorMetricsException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 监控管理服务实现
 *
 * @author tomsun28
 * @date 2021/11/14 13:06
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class MonitorServiceImpl implements MonitorService {

    private static final Long MONITOR_ID_TMP = 1000000000L;

    @Autowired
    private AppService appService;

    @Autowired
    private CollectJobService collectJobService;

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Autowired
    private CalculateAlarm calculateAlarm;

    @Override
    @Transactional(readOnly = true)
    public void detectMonitor(Monitor monitor, List<Param> params) throws MonitorDetectException {
        Long monitorId = monitor.getId();
        if (monitorId == null || monitorId == 0) {
            monitorId = MONITOR_ID_TMP;
        }
        Job appDefine = appService.getAppDefine(monitor.getApp());
        appDefine.setMonitorId(monitorId);
        appDefine.setCyclic(false);
        appDefine.setTimestamp(System.currentTimeMillis());
        List<Configmap> configmaps = params.stream().map(param ->
                new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);
        // To detect availability, you only need to collect the set of availability indicators with a priority of 0.
        // 探测可用性只需要采集优先级为0的可用性指标集合
        List<Metrics> availableMetrics = appDefine.getMetrics().stream()
                .filter(item -> item.getPriority() == 0).collect(Collectors.toList());
        appDefine.setMetrics(availableMetrics);
        List<CollectRep.MetricsData> collectRep = collectJobService.collectSyncJobData(appDefine);
        // If the detection result fails, a detection exception is thrown
        // 判断探测结果 失败则抛出探测异常
        if (collectRep == null || collectRep.isEmpty()) {
            throw new MonitorDetectException("No collector response");
        }
        if (collectRep.get(0).getCode() != CollectRep.Code.SUCCESS) {
            throw new MonitorDetectException(collectRep.get(0).getMsg());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addMonitor(Monitor monitor, List<Param> params) throws RuntimeException {
        // Apply for monitor id         申请 monitor id
        long monitorId = SnowFlakeIdGenerator.generateId();
        // Init Set Default Tags: monitorId monitorName app
        List<Tag> tags = monitor.getTags();
        if (tags == null) {
            tags = new LinkedList<>();
            monitor.setTags(tags);
        }
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_ID).value(String.valueOf(monitorId)).type((byte) 0).build());
        tags.add(Tag.builder().name(CommonConstants.TAG_MONITOR_NAME).value(String.valueOf(monitor.getName())).type((byte) 0).build());
        // Construct the collection task Job entity     构造采集任务Job实体
        Job appDefine = appService.getAppDefine(monitor.getApp());
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
        long jobId = collectJobService.addAsyncCollectJob(appDefine);
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
            collectJobService.cancelAsyncCollectJob(jobId);
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
        List<String> metricsDefineNames = metricsDefine.stream().map(Metrics::getName).collect(Collectors.toList());
        if (CollectionUtils.isEmpty(metrics) || !metricsDefineNames.containsAll(metrics)){
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
        long jobId = collectJobService.addAsyncCollectJob(appDefine);
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
            collectJobService.cancelAsyncCollectJob(jobId);
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    public List<String> getMonitorMetrics(String app) {
        return appService.getAppDefineMetricNames(app);
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
        // Check name uniqueness    校验名称唯一性
        if (isModify != null) {
            Optional<Monitor> monitorOptional = monitorDao.findMonitorByNameEquals(monitor.getName());
            if (monitorOptional.isPresent()) {
                Monitor existMonitor = monitorOptional.get();
                if (isModify) {
                    if (!existMonitor.getId().equals(monitor.getId())) {
                        throw new IllegalArgumentException("监控名称不能重复!");
                    }
                } else {
                    throw new IllegalArgumentException("监控名称不能重复!");
                }
            }
        }
        // todo 校验标签
        if (monitor.getTags() != null) {
            monitor.setTags(monitor.getTags().stream().distinct().collect(Collectors.toList()));
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
                        case "text":
                            Short limit = paramDefine.getLimit();
                            if (limit != null) {
                                if (param.getValue() != null && param.getValue().length() > limit) {
                                    throw new IllegalArgumentException("Params field " + field + " type "
                                            + paramDefine.getType() + " over limit " + limit);
                                }
                            }
                            break;
                        case "host":
                            String hostValue = param.getValue();
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
                            try {
                                Boolean.parseBoolean(booleanValue);
                            } catch (Exception e) {
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
                            // todo checkbox校验
                            break;
                        case "key-value":
                            // todo key-value校验
                            break;
                        // todo More parameter definitions and actual value format verification
                        //  更多参数定义与实际值格式校验
                        default:
                            throw new IllegalArgumentException("ParamDefine type " + paramDefine.getType() + " is invalid.");
                    }
                }
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void modifyMonitor(Monitor monitor, List<Param> params) throws RuntimeException {
        long monitorId = monitor.getId();
        // Check to determine whether the monitor corresponding to the monitor id exists
        // 查判断monitorId对应的此监控是否存在
        Optional<Monitor> queryOption = monitorDao.findById(monitorId);
        if (!queryOption.isPresent()) {
            throw new IllegalArgumentException("The Monitor " + monitorId + " not exists");
        }
        Monitor preMonitor = queryOption.get();
        if (!preMonitor.getApp().equals(monitor.getApp())) {
            // The type of monitoring cannot be modified
            // 监控的类型不能修改
            throw new IllegalArgumentException("Can not modify monitor's app type");
        }
        // Auto Update Default Tags: monitorName
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
        // Construct the collection task Job entity
        // 构造采集任务Job实体
        Job appDefine = appService.getAppDefine(monitor.getApp());
        appDefine.setId(preMonitor.getJobId());
        appDefine.setMonitorId(monitorId);
        appDefine.setInterval(monitor.getIntervals());
        appDefine.setCyclic(true);
        appDefine.setTimestamp(System.currentTimeMillis());
        List<Configmap> configmaps = params.stream().map(param ->
                new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);
        // After the update is successfully released, refresh the library
        // 下发更新成功后刷库
        try {
            monitor.setJobId(preMonitor.getJobId());
            monitor.setStatus(preMonitor.getStatus());
            // force update gmtUpdate time, due the case: monitor not change, param change. we also think monitor change
            monitor.setGmtUpdate(LocalDateTime.now());
            monitorDao.save(monitor);
            paramDao.saveAll(params);
            // Update the collection task after the storage is completed
            // 入库完成后更新采集任务
            collectJobService.updateAsyncCollectJob(appDefine);
            calculateAlarm.triggeredAlertMap.remove(String.valueOf(monitorId));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
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
            paramDao.deleteParamsByMonitorId(id);
            alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdEquals(id);
            collectJobService.cancelAsyncCollectJob(monitor.getJobId());
            calculateAlarm.triggeredAlertMap.remove(String.valueOf(monitor.getId()));
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitors(Set<Long> ids) throws RuntimeException {
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        if (monitors != null) {
            monitorDao.deleteAll(monitors);
            paramDao.deleteParamsByMonitorIdIn(ids);
            alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdIn(monitors.stream()
                    .map(Monitor::getId).collect(Collectors.toList()));
            for (Monitor monitor : monitors) {
                collectJobService.cancelAsyncCollectJob(monitor.getJobId());
                calculateAlarm.triggeredAlertMap.remove(String.valueOf(monitor.getId()));
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
            Job job = appService.getAppDefine(monitor.getApp());
            List<String> metrics = job.getMetrics().stream()
                    .filter(Metrics::isVisible)
                    .map(Metrics::getName).collect(Collectors.toList());
            monitorDto.setMetrics(metrics);
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
        // 更新监控状态  删除对应的监控周期性任务
        // The jobId is not deleted, and the jobId is reused again after the management is started.
        // jobId不删除 待启动纳管之后再次复用jobId
        List<Monitor> managedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() != CommonConstants.UN_MANAGE_CODE && monitor.getJobId() != null)
                .peek(monitor -> monitor.setStatus(CommonConstants.UN_MANAGE_CODE))
                .collect(Collectors.toList());
        if (!managedMonitors.isEmpty()) {
            monitorDao.saveAll(managedMonitors);
            for (Monitor monitor : managedMonitors) {
                collectJobService.cancelAsyncCollectJob(monitor.getJobId());
            }
        }
    }

    @Override
    public void enableManageMonitors(HashSet<Long> ids) {
        // Update monitoring status Add corresponding monitoring periodic task
        // 更新监控状态 新增对应的监控周期性任务
        List<Monitor> unManagedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() == CommonConstants.UN_MANAGE_CODE && monitor.getJobId() != null)
                .peek(monitor -> monitor.setStatus(CommonConstants.AVAILABLE_CODE))
                .collect(Collectors.toList());
        if (!unManagedMonitors.isEmpty()) {
            monitorDao.saveAll(unManagedMonitors);
            for (Monitor monitor : unManagedMonitors) {
                // Construct the collection task Job entity
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setId(monitor.getJobId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param ->
                        new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
                appDefine.setConfigmap(configmaps);
                // Issue collection tasks       下发采集任务
                collectJobService.addAsyncCollectJob(appDefine);
                calculateAlarm.triggeredAlertMap.remove(String.valueOf(monitor.getId()));
            }
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
                case CommonConstants.UN_REACHABLE_CODE:
                    appCount.setUnReachableSize(appCount.getUnReachableSize() + item.getSize());
                    break;
                default:
                    break;
            }
            appCountMap.put(item.getApp(), appCount);
        }
        //Traverse the map obtained by statistics and convert it into a List<App Count> result set
        //遍历统计得到的map，转换成List<App Count>结果集
        return appCountMap.values().stream().map(item -> {
            item.setSize(item.getAvailableSize() + item.getUnManageSize()
                    + item.getUnReachableSize() + item.getUnAvailableSize());
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
}
