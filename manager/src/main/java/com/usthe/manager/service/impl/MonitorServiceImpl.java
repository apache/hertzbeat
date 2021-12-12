package com.usthe.manager.service.impl;

import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
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
import com.usthe.manager.pojo.entity.Monitor;
import com.usthe.manager.pojo.entity.Param;
import com.usthe.manager.pojo.entity.ParamDefine;
import com.usthe.manager.service.AppService;
import com.usthe.manager.service.MonitorService;
import com.usthe.manager.support.exception.MonitorDatabaseException;
import com.usthe.manager.support.exception.MonitorDetectException;
import com.usthe.scheduler.JobScheduling;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 监控管理服务实现
 * @author tomsun28
 * @date 2021/11/14 13:06
 */
@Service
@Slf4j
public class MonitorServiceImpl implements MonitorService {

    private static final Long MONITOR_ID_TMP = 1000000000L;

    @Autowired
    private AppService appService;

    @Autowired
    private JobScheduling jobScheduling;

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

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
        List<CollectRep.MetricsData> collectRep = jobScheduling.addSyncCollectJob(appDefine);
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
        // 申请 monitor id
        long monitorId = SnowFlakeIdGenerator.generateId();
        // 构造采集任务Job实体
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
        // 下发采集任务得到jobId
        long jobId = jobScheduling.addAsyncCollectJob(appDefine);
        // 下发成功后刷库
        try {
            monitor.setId(monitorId);
            monitor.setJobId(jobId);
            monitor.setStatus(CommonConstants.AVAILABLE_CODE);
            monitorDao.save(monitor);
            paramDao.saveAll(params);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // 刷库异常取消之前的下发任务
            jobScheduling.cancelAsyncCollectJob(jobId);
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void validate(MonitorDto monitorDto, boolean isModify) throws IllegalArgumentException {
        // 请求监控参数与监控参数定义映射校验匹配
        Monitor monitor = monitorDto.getMonitor();
        Map<String, Param> paramMap = monitorDto.getParams()
                .stream()
                .peek(param -> param.setMonitorId(monitor.getId()))
                .collect(Collectors.toMap(Param::getField, param -> param));
        List<ParamDefine> paramDefines = appService.getAppParamDefines(monitorDto.getMonitor().getApp());
        if (paramDefines != null) {
            for (ParamDefine paramDefine : paramDefines) {
                String field = paramDefine.getField();
                Param param = paramMap.get(field);
                if (paramDefine.isRequired() && param == null) {
                    throw new IllegalArgumentException("Params field " + field + " is required.");
                }
                if (param != null) {
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
                            break;
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
                            // 明文密码需加密传输存储
                            String passwordValue = param.getValue();
                            if (!AesUtil.isCiphertext(passwordValue)) {
                                passwordValue = AesUtil.aesEncode(passwordValue);
                                param.setValue(passwordValue);
                            }
                            break;
                        case "boolean":
                            // boolean校验
                            String booleanValue = param.getValue();
                            try {
                                Boolean.parseBoolean(booleanValue);
                            } catch (Exception e) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + booleanValue + " is invalid boolean value.");
                            }
                            break;
                        case "radio":
                            // todo radio校验
                            break;
                        case "checkbox":
                            // todo checkbox校验
                            break;
                        // todo 更多参数定义与实际值格式校验
                        default:
                            throw new IllegalArgumentException("ParamDefine type " + paramDefine.getType() + " is invalid.");
                    }
                }
            }
        }
    }

    @Override
    public void modifyMonitor(Monitor monitor, List<Param> params) throws RuntimeException {
        long monitorId = monitor.getId();
        // 查判断monitorId对应的此监控是否存在
        Optional<Monitor> queryOption = monitorDao.findById(monitorId);
        if (!queryOption.isPresent()) {
            throw new IllegalArgumentException("The Monitor " + monitorId + " not exists");
        }
        Monitor preMonitor = queryOption.get();
        if (!preMonitor.getApp().equals(monitor.getApp()) || !preMonitor.getHost().equals(monitor.getHost())) {
            // 监控的 类型和host不能修改
            throw new IllegalArgumentException("Can not modify monitor's app or host");
        }
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
        // 更新采集任务
        jobScheduling.updateAsyncCollectJob(appDefine);
        // 下发更新成功后刷库
        try {
            monitor.setJobId(preMonitor.getJobId());
            monitor.setStatus(preMonitor.getStatus());
            monitorDao.save(monitor);
            paramDao.saveAll(params);
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
            jobScheduling.cancelAsyncCollectJob(monitor.getJobId());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitors(Set<Long> ids) throws RuntimeException {
        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        if (monitors != null) {
            monitorDao.deleteAll(monitors);
            paramDao.deleteParamsByMonitorIdIn(ids);
            for (Monitor monitor : monitors) {
                jobScheduling.cancelAsyncCollectJob(monitor.getJobId());
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
            List<String> metrics = job.getMetrics().stream().map(Metrics::getName).collect(Collectors.toList());
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
        // 更新监控状态  删除对应的监控周期性任务
        // jobId不删除 待启动纳管之后再次复用jobId
        List<Monitor> managedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() != CommonConstants.UN_MANAGE_CODE && monitor.getJobId() != null)
                .peek(monitor -> monitor.setStatus(CommonConstants.UN_MANAGE_CODE))
                .collect(Collectors.toList());
        if (!managedMonitors.isEmpty()) {
            monitorDao.saveAll(managedMonitors);
            for (Monitor monitor : managedMonitors) {
                jobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            }
        }
    }

    @Override
    public void enableManageMonitors(HashSet<Long> ids) {
        // 更新监控状态 新增对应的监控周期性任务
        List<Monitor> unManagedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() == CommonConstants.UN_MANAGE_CODE && monitor.getJobId() != null)
                .peek(monitor -> monitor.setStatus(CommonConstants.AVAILABLE_CODE))
                .collect(Collectors.toList());
        if (!unManagedMonitors.isEmpty()) {
            monitorDao.saveAll(unManagedMonitors);
            for (Monitor monitor : unManagedMonitors) {
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param ->
                        new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
                appDefine.setConfigmap(configmaps);
                // 下发采集任务
                jobScheduling.addAsyncCollectJob(appDefine);
            }
        }
    }

    @Override
    public List<AppCount> getAllAppMonitorsCount() {
        return monitorDao.findAppsCount();

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
