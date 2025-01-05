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

package org.apache.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.collect.Sets;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.ListJoin;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.dao.AlertDefineBindDao;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.CommonRequestProtocol;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.MonitorBind;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.entity.manager.SdMonitorParam;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.FileUtil;
import org.apache.hertzbeat.common.util.IntervalExpressionUtil;
import org.apache.hertzbeat.common.util.IpDomainUtil;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.SdMonitorOperator;
import org.apache.hertzbeat.common.util.SnowFlakeIdGenerator;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.AppCount;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.scheduler.CollectJobScheduling;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.ImExportService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.TagService;
import org.apache.hertzbeat.manager.support.exception.MonitorDatabaseException;
import org.apache.hertzbeat.manager.support.exception.MonitorDetectException;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * Monitoring and management service implementation
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class MonitorServiceImpl implements MonitorService {
    private static final Long MONITOR_ID_TMP = 1000000000L;

    public static final String PATTERN_HTTP = "(?i)http://";
    public static final String PATTERN_HTTPS = "(?i)https://";

    private static final byte ALL_MONITOR_STATUS = 9;

    private static final int TAG_LENGTH = 2;

    private static final String CONTENT_VALUE = MediaType.APPLICATION_OCTET_STREAM_VALUE + SignConstants.SINGLE_MARK + "charset=" + StandardCharsets.UTF_8;

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
    private MonitorBindDao monitorBindDao;

    @Autowired
    private CollectorDao collectorDao;

    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private DashboardService dashboardService;

    private final Map<String, ImExportService> imExportServiceMap = new HashMap<>();

    public MonitorServiceImpl(List<ImExportService> imExportServiceList) {
        imExportServiceList.forEach(it -> imExportServiceMap.put(it.type(), it));
    }

    @Override
    @Transactional(readOnly = true)
    public void detectMonitor(Monitor monitor, List<Param> params, String collector) throws MonitorDetectException {
        final Optional<Param> sdParam = SdMonitorOperator.getSdParam(params);

        if (sdParam.isPresent()) {
            collectOneTimeSdData(monitor, collector, sdParam.get());
        } else {
            detectMonitorDirectly(monitor, params, collector);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addMonitor(Monitor monitor, List<Param> params, String collector, GrafanaDashboard grafanaDashboard) throws RuntimeException {
        final Optional<Param> sdParam = SdMonitorOperator.getSdParam(params);
        if (sdParam.isPresent()) {
            addAndSaveMonitorJob(monitor.clone(), params, collector, SdMonitorParam.builder().sdParam(sdParam.get()).build(), grafanaDashboard);
            return;
        }

        addAndSaveMonitorJob(monitor, params, collector, null, grafanaDashboard);
    }

    @Override
    public void export(List<Long> ids, String type, HttpServletResponse res) throws Exception {
        var imExportService = imExportServiceMap.get(type);
        if (imExportService == null) {
            throw new IllegalArgumentException("not support export type: " + type);
        }
        var fileName = imExportService.getFileName();
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, CONTENT_VALUE);
        res.setContentType(CONTENT_VALUE);
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=" + URLEncoder.encode(fileName, StandardCharsets.UTF_8));
        res.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION);
        imExportService.exportConfig(res.getOutputStream(), ids);
    }

    @Override
    public void importConfig(MultipartFile file) throws Exception {

        var fileName = FileUtil.getFileName(file);
        var type = FileUtil.getFileType(file);
        if (!imExportServiceMap.containsKey(type)) {
            throw new RuntimeException(ExportFileConstants.FILE + " " + fileName + " is not supported.");
        }
        var imExportService = imExportServiceMap.get(type);
        imExportService.importConfig(file.getInputStream());
    }


    @Override
    @Transactional(readOnly = true)
    public void validate(MonitorDto monitorDto, Boolean isModify) throws IllegalArgumentException {
        // The request monitoring parameter matches the monitoring parameter definition mapping check
        Monitor monitor = monitorDto.getMonitor();
        monitor.setHost(monitor.getHost().trim());
        monitor.setName(monitor.getName().trim());
        Map<String, Param> paramMap = monitorDto.getParams()
                .stream()
                .peek(param -> {
                    param.setMonitorId(monitor.getId());
                    String value = param.getParamValue() == null ? null : param.getParamValue().trim();
                    param.setParamValue(value);
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
        // the dispatch collector must exist if pin
        if (StringUtils.isNotBlank(monitorDto.getCollector())) {
            Optional<Collector> optionalCollector = collectorDao.findCollectorByName(monitorDto.getCollector());
            if (optionalCollector.isEmpty()) {
                throw new IllegalArgumentException("The pinned collector does not exist.");
            }
        } else {
            monitorDto.setCollector(null);
        }
        // Parameter definition structure verification
        List<ParamDefine> paramDefines = appService.getAppParamDefines(monitorDto.getMonitor().getApp());
        if (!CollectionUtils.isEmpty(paramDefines)) {
            for (ParamDefine paramDefine : paramDefines) {
                String field = paramDefine.getField();
                Param param = paramMap.get(field);
                if (paramDefine.isRequired() && (param == null || param.getParamValue() == null)) {
                    throw new IllegalArgumentException("Params field " + field + " is required.");
                }
                if (param != null && param.getParamValue() != null && StringUtils.isNotBlank(param.getParamValue())) {
                    switch (paramDefine.getType()) {
                        case "number":
                            double doubleValue;
                            try {
                                doubleValue = Double.parseDouble(param.getParamValue());
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
                            if (textareaLimit != null && param.getParamValue().length() > textareaLimit) {
                                throw new IllegalArgumentException("Params field " + field + " type "
                                        + paramDefine.getType() + " over limit " + param.getParamValue());
                            }
                            break;
                        case "text":
                            Short textLimit = paramDefine.getLimit();
                            if (textLimit != null && param.getParamValue().length() > textLimit) {
                                throw new IllegalArgumentException("Params field " + field + " type "
                                        + paramDefine.getType() + " over limit " + textLimit);
                            }
                            break;
                        case "host":
                            String hostValue = param.getParamValue();
                            if (hostValue.toLowerCase().contains(NetworkConstants.HTTP_HEADER)) {
                                hostValue = hostValue.replaceAll(PATTERN_HTTP, SignConstants.BLANK);
                            }
                            if (hostValue.toLowerCase().contains(NetworkConstants.HTTPS_HEADER)) {
                                hostValue = hostValue.replace(PATTERN_HTTPS, SignConstants.BLANK);
                            }
                            if (!IpDomainUtil.validateIpDomain(hostValue)) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + hostValue + " is invalid host value.");
                            }
                            break;
                        case "password":
                            // The plaintext password needs to be encrypted for transmission and storage
                            String passwordValue = param.getParamValue();
                            if (!AesUtil.isCiphertext(passwordValue)) {
                                passwordValue = AesUtil.aesEncode(passwordValue);
                                param.setParamValue(passwordValue);
                            }
                            param.setType(CommonConstants.PARAM_TYPE_PASSWORD);
                            break;
                        case "boolean":
                            // boolean check
                            String booleanValue = param.getParamValue();
                            if (!"true".equalsIgnoreCase(booleanValue) && !"false".equalsIgnoreCase(booleanValue)) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + booleanValue + " is invalid boolean value.");
                            }
                            break;
                        case "radio":
                            // radio single value check
                            List<ParamDefine.Option> options = paramDefine.getOptions();
                            boolean invalid = true;
                            if (options != null) {
                                for (ParamDefine.Option option : options) {
                                    if (param.getParamValue().equalsIgnoreCase(option.getValue())) {
                                        invalid = false;
                                        break;
                                    }
                                }
                            }
                            if (invalid) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getParamValue() + " is invalid option value");
                            }
                            break;
                        case "checkbox":
                            List<ParamDefine.Option> checkboxOptions = paramDefine.getOptions();
                            boolean checkboxInvalid = true;
                            if (checkboxOptions != null) {
                                for (ParamDefine.Option option : checkboxOptions) {
                                    if (param.getParamValue().equalsIgnoreCase(option.getValue())) {
                                        checkboxInvalid = false;
                                        break;
                                    }
                                }
                            }
                            if (checkboxInvalid) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getParamValue() + " is invalid checkbox value");
                            }
                            break;
                        case "metrics-field":
                        case "key-value":
                            if (JsonUtil.fromJson(param.getParamValue(), new TypeReference<>() {
                            }) == null) {
                                throw new IllegalArgumentException("Params field " + field + " value "
                                        + param.getParamValue() + " is invalid key-value value");
                            }
                            break;
                        case "array":
                            String[] arrays = param.getParamValue().split(",");
                            if (arrays.length == 0) {
                                throw new IllegalArgumentException("Param field" + field + " value "
                                        + param.getParamValue() + " is invalid arrays value");
                            }
                            if (param.getParamValue().startsWith("[") && param.getParamValue().endsWith("]")) {
                                param.setParamValue(param.getParamValue().substring(1, param.getParamValue().length() - 1));
                            }
                            break;
                        // todo More parameter definitions and actual value format verification
                        default:
                            throw new IllegalArgumentException("ParamDefine type " + paramDefine.getType() + " is invalid.");
                    }
                }
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void modifyMonitor(Monitor monitor, List<Param> params, String collector, GrafanaDashboard grafanaDashboard) throws RuntimeException {
        final Optional<Param> sdParam = SdMonitorOperator.getSdParam(params);
        long monitorId = monitor.getId();
        // Check to determine whether the monitor corresponding to the monitor id exists
        Optional<Monitor> queryOption = monitorDao.findById(monitorId);
        if (queryOption.isEmpty()) {
            throw new IllegalArgumentException("The Monitor " + monitorId + " not exists");
        }
        Monitor preMonitor = queryOption.get();
        if (!preMonitor.getApp().equals(monitor.getApp())) {
            // The type of monitoring cannot be modified
            throw new IllegalArgumentException("Can not modify monitor's app type");
        }
        Map<String, String> labels = monitor.getLabels();
        if (labels == null) {
            labels = new HashMap<>(8);
            monitor.setLabels(labels);
        }

        if (preMonitor.getStatus() != CommonConstants.MONITOR_PAUSED_CODE) {
            // Construct the collection task Job entity
            Job appDefine = appService.getAppDefine(monitor.getApp());
            if (sdParam.isPresent()) {
                // not allow to modify a sub monitor to main monitor
                labels.entrySet()
                        .stream()
                        .filter(label -> org.apache.commons.lang3.StringUtils.equals(label.getKey(), CommonConstants.TAG_AUTO_CREATED))
                        .findFirst()
                        .ifPresent(label -> {
                            final MonitorBind isSubMonitorBefore = monitorBindDao.findMonitorBindByBizIdAndMonitorIdAndType(Long.valueOf(label.getValue()),
                                    monitorId, CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR);
                            if (Objects.nonNull(isSubMonitorBefore)) {
                                throw new UnsupportedOperationException("Can not change a auto-created monitor to sd! ");
                            }
                        });
                // create main monitor bind
                final List<MonitorBind> mainMonitorBind = monitorBindDao.findMonitorBindByBizIdAndType(monitorId, CommonConstants.MONITOR_BIND_TYPE_SD_MAIN_MONITOR);
                if (CollectionUtils.isEmpty(mainMonitorBind)) {
                    monitorBindDao.save(Objects.requireNonNull(
                            SdMonitorOperator.buildSdMainMonitorBind(
                                    SdMonitorParam.builder().sdParam(sdParam.get()).build(), monitorId
                            )));
                }

                appDefine = SdMonitorOperator.constructSdJob(appDefine, sdParam.get());
                labels.put(CommonConstants.TAG_SD_MAIN_MONITOR, ServiceDiscoveryProtocol.Type.getType(sdParam.get().getField()).name());
            }

            if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
            }
            appDefine.setId(preMonitor.getJobId());
            appDefine.setMonitorId(monitorId);
            appDefine.setDefaultInterval(monitor.getIntervals());
            appDefine.setCyclic(true);
            appDefine.setTimestamp(System.currentTimeMillis());
            List<Configmap> configmaps = params.stream().map(param ->
                    new Configmap(param.getField(), param.getParamValue(), param.getType())).collect(Collectors.toList());
            appDefine.setConfigmap(configmaps);
            long newJobId;
            if (collector == null) {
                newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine);
            } else {
                newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine, collector);
            }
            monitor.setJobId(newJobId);
        }

        try {
            detectMonitor(monitor, params, collector);
        } catch (Exception ignored) {}

        // After the update is successfully released, refresh the database
        try {
            collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(monitorId);
            if (collector != null) {
                CollectorMonitorBind collectorMonitorBind = CollectorMonitorBind.builder()
                        .collector(collector).monitorId(monitorId)
                        .build();
                collectorMonitorBindDao.save(collectorMonitorBind);
            }
            // force update gmtUpdate time, due the case: monitor not change, param change. we also think monitor change
            monitor.setGmtUpdate(LocalDateTime.now());
            // update or open grafana dashboard
            if (monitor.getApp().equals(CommonConstants.PROMETHEUS) && grafanaDashboard != null) {
                if (grafanaDashboard.isEnabled()) {
                    dashboardService.createOrUpdateDashboard(grafanaDashboard.getTemplate(), monitorId);
                } else {
                    dashboardService.closeGrafanaDashboard(monitorId);
                }
            }
            monitorDao.save(monitor);

            // delete all sub monitor if sd param is removed
            final List<MonitorBind> subMonitorBindList = monitorBindDao.findMonitorBindByBizIdAndType(monitorId, CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR);
            if (!CollectionUtils.isEmpty(subMonitorBindList) && sdParam.isEmpty()) {
                deleteMonitors(subMonitorBindList.stream().map(MonitorBind::getMonitorId).collect(Collectors.toSet()));
            }
            paramDao.saveAll(params);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // Repository brushing abnormally cancels the previously delivered task
            collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            throw new MonitorDatabaseException(e.getMessage());
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitor(long id) throws RuntimeException {
        deleteMonitors(Sets.newHashSet(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMonitors(Set<Long> ids) throws RuntimeException {
        if (CollectionUtils.isEmpty(ids)) {
            return;
        }

        final List<MonitorBind> allSubMonitorBind = monitorBindDao.findAllByBizIdInAndType(ids, CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR);
        if (!CollectionUtils.isEmpty(allSubMonitorBind)) {
            ids.addAll(allSubMonitorBind.stream().map(MonitorBind::getMonitorId).collect(Collectors.toSet()));
        }

        List<Monitor> monitors = monitorDao.findMonitorsByIdIn(ids);
        if (!monitors.isEmpty()) {
            monitorDao.deleteAll(monitors);
            paramDao.deleteParamsByMonitorIdIn(ids);
            Set<Long> monitorIds = monitors.stream().map(Monitor::getId).collect(Collectors.toSet());
            alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdIn(monitorIds);
            for (Monitor monitor : monitors) {
                monitorBindDao.deleteByMonitorId(monitor.getId());
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
            List<Param> params = paramDao.findParamsByMonitorId(id);
            monitorDto.setParams(params);
            if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(monitor.getApp())) {
                List<CollectRep.MetricsData> metricsDataList = warehouseService.queryMonitorMetricsData(id);
                List<String> metrics = metricsDataList.stream().map(CollectRep.MetricsData::getMetrics).collect(Collectors.toList());
                monitorDto.setMetrics(metrics);
                monitorDto.setGrafanaDashboard(dashboardService.getDashboardByMonitorId(id));
            } else {
                Job job = appService.getAppDefine(monitor.getApp());
                List<String> metrics = job.getMetrics().stream()
                        .filter(Metrics::isVisible)
                        .map(Metrics::getName).collect(Collectors.toList());
                monitorDto.setMetrics(metrics);
            }
            monitorDto.setMonitor(monitor);
            Optional<CollectorMonitorBind> bindOptional = collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitor.getId());
            bindOptional.ifPresent(bind -> monitorDto.setCollector(bind.getCollector()));
            return monitorDto;
        } else {
            return null;
        }
    }

    @Override
    public Page<Monitor> getMonitors(List<Long> monitorIds, String app, String name, String host, Byte status, String sort, String order, int pageIndex, int pageSize, String tag) {
        Specification<Monitor> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (!CollectionUtils.isEmpty(monitorIds)) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : monitorIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (StringUtils.isNotBlank(app)) {
                Predicate predicateApp = criteriaBuilder.equal(root.get("app"), app);
                andList.add(predicateApp);
            }
            if (status != null && status >= 0 && status < ALL_MONITOR_STATUS) {
                Predicate predicateStatus = criteriaBuilder.equal(root.get("status"), status);
                andList.add(predicateStatus);
            }

            if (StringUtils.isNotBlank(tag)) {
                String[] tagArr = tag.split(":");
                String tagName = tagArr[0];
                ListJoin<Monitor, Tag> tagJoin = root
                        .join(root.getModel()
                                .getList("tags", org.apache.hertzbeat.common.entity.manager.Tag.class), JoinType.LEFT);
                if (tagArr.length == TAG_LENGTH) {
                    String tagValue = tagArr[1];
                    andList.add(criteriaBuilder.equal(tagJoin.get("name"), tagName));
                    andList.add(criteriaBuilder.equal(tagJoin.get("tagValue"), tagValue));
                } else {
                    andList.add(criteriaBuilder.equal(tagJoin.get("name"), tag));
                }
            }
            Predicate[] andPredicates = new Predicate[andList.size()];
            Predicate andPredicate = criteriaBuilder.and(andList.toArray(andPredicates));

            List<Predicate> orList = new ArrayList<>();
            if (StringUtils.isNotBlank(host)) {
                Predicate predicateHost = criteriaBuilder.like(root.get("host"), "%" + host + "%");
                orList.add(predicateHost);
            }
            if (StringUtils.isNotBlank(name)) {
                Predicate predicateName = criteriaBuilder.like(root.get("name"), "%" + name + "%");
                orList.add(predicateName);
            }
            Predicate[] orPredicates = new Predicate[orList.size()];
            Predicate orPredicate = criteriaBuilder.or(orList.toArray(orPredicates));

            if (andPredicates.length == 0 && orPredicates.length == 0) {
                return query.where().getRestriction();
            } else if (andPredicates.length == 0) {
                return orPredicate;
            } else if (orPredicates.length == 0) {
                return andPredicate;
            } else {
                return query.where(andPredicate, orPredicate).getRestriction();
            }
        };
        // Pagination is a must
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return monitorDao.findAll(specification, pageRequest);
    }

    @Override
    public void cancelManageMonitors(HashSet<Long> ids) {
        if (CollectionUtils.isEmpty(ids)) {
            return;
        }

        final Set<Long> subMonitorIds = monitorBindDao.findAllByBizIdInAndType(ids, CommonConstants.MONITOR_BIND_TYPE_SD_SUB_MONITOR).stream()
                .map(MonitorBind::getMonitorId)
                .collect(Collectors.toSet());
        if (!CollectionUtils.isEmpty(subMonitorIds)) {
            ids.addAll(subMonitorIds);
        }

        // Update monitoring status Delete corresponding monitoring periodic task
        // The jobId is not deleted, and the jobId is reused again after the management is started.
        List<Monitor> managedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() != CommonConstants.MONITOR_PAUSED_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.MONITOR_PAUSED_CODE))
                .collect(Collectors.toList());
        if (!CollectionUtils.isEmpty(managedMonitors)) {
            for (Monitor monitor : managedMonitors) {
                collectJobScheduling.cancelAsyncCollectJob(monitor.getJobId());
            }
            monitorDao.saveAll(managedMonitors);
        }
    }

    @Override
    public void enableManageMonitors(HashSet<Long> ids) {
        // Update monitoring status Add corresponding monitoring periodic task
        List<Monitor> unManagedMonitors = monitorDao.findMonitorsByIdIn(ids)
                .stream().filter(monitor ->
                        monitor.getStatus() == CommonConstants.MONITOR_PAUSED_CODE)
                .peek(monitor -> monitor.setStatus(CommonConstants.MONITOR_UP_CODE))
                .collect(Collectors.toList());
        if (unManagedMonitors.isEmpty()) {
            return;
        }

        for (Monitor monitor : unManagedMonitors) {
            // Construct the collection task Job entity
            List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
            final Optional<Param> sdParam = SdMonitorOperator.getSdParam(params);
            Job appDefine = appService.getAppDefine(monitor.getApp());
            if (sdParam.isPresent()) {
                final List<MonitorBind> mainMonitorBind = monitorBindDao.findMonitorBindByBizIdAndType(monitor.getId(), CommonConstants.MONITOR_BIND_TYPE_SD_MAIN_MONITOR);
                if (CollectionUtils.isEmpty(mainMonitorBind)) {
                    monitorBindDao.save(Objects.requireNonNull(
                            SdMonitorOperator.buildSdMainMonitorBind(
                                    SdMonitorParam.builder().sdParam(sdParam.get()).build(), monitor.getId()
                            )));
                }

                appDefine = SdMonitorOperator.constructSdJob(appDefine, sdParam.get());
            }

            if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
                appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
            }
            appDefine.setMonitorId(monitor.getId());
            appDefine.setDefaultInterval(monitor.getIntervals());
            appDefine.setCyclic(true);
            appDefine.setTimestamp(System.currentTimeMillis());
            List<Configmap> configmaps = params.stream().map(param ->
                    new Configmap(param.getField(), param.getParamValue(), param.getType())).collect(Collectors.toList());
            List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                    .filter(item -> StringUtils.isNotBlank(item.getDefaultValue()))
                    .toList();
            paramDefaultValue.forEach(defaultVar -> {
                if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                    Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), CommonConstants.TYPE_STRING);
                    configmaps.add(configmap);
                }
            });
            appDefine.setConfigmap(configmaps);

            // Issue collection tasks
            Optional<CollectorMonitorBind> bindOptional =
                    collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitor.getId());
            String collector = bindOptional.map(CollectorMonitorBind::getCollector).orElse(null);
            long newJobId = collectJobScheduling.addAsyncCollectJob(appDefine, collector);
            monitor.setJobId(newJobId);
            applicationContext.publishEvent(new MonitorDeletedEvent(applicationContext, monitor.getId()));
            try {
                detectMonitor(monitor, params, collector);
            } catch (Exception ignored) {}
        }
        monitorDao.saveAll(unManagedMonitors);
    }

    @Override
    public List<AppCount> getAllAppMonitorsCount() {
        List<AppCount> appCounts = monitorDao.findAppsStatusCount();
        if (CollectionUtils.isEmpty(appCounts)) {
            return null;
        }
        //Statistical category information, calculate the number of corresponding states for each monitor
        Map<String, AppCount> appCountMap = new HashMap<>(appCounts.size());
        for (AppCount item : appCounts) {
            AppCount appCount = appCountMap.getOrDefault(item.getApp(), new AppCount());
            appCount.setApp(item.getApp());
            switch (item.getStatus()) {
                case CommonConstants.MONITOR_UP_CODE -> appCount.setAvailableSize(appCount.getAvailableSize() + item.getSize());
                case CommonConstants.MONITOR_DOWN_CODE -> appCount.setUnAvailableSize(appCount.getUnAvailableSize() + item.getSize());
                case CommonConstants.MONITOR_PAUSED_CODE -> appCount.setUnManageSize(appCount.getUnManageSize() + item.getSize());
                default -> {}
            }
            appCountMap.put(item.getApp(), appCount);
        }
        //Traverse the map obtained by statistics and convert it into a List<App Count> result set
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
                .stream().filter(monitor -> monitor.getStatus() != CommonConstants.MONITOR_PAUSED_CODE)
                .toList();
        if (monitors.isEmpty()) {
            return;
        }
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
                appDefine.setDefaultInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param -> new Configmap(param.getField(),
                        param.getParamValue(), param.getType())).collect(Collectors.toList());
                List<ParamDefine> paramDefaultValue = appDefine.getParams().stream()
                        .filter(item -> StringUtils.isNotBlank(item.getDefaultValue()))
                        .toList();
                paramDefaultValue.forEach(defaultVar -> {
                    if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                        Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
                        configmaps.add(configmap);
                    }
                });
                appDefine.setConfigmap(configmaps);
                // if is pinned collector
                String collector = monitorIdCollectorMap.get(monitor.getId());
                // Delivering a collection task
                long newJobId = collectJobScheduling.updateAsyncCollectJob(appDefine, collector);
                monitor.setJobId(newJobId);
                monitorDao.save(monitor);   
            } catch (Exception e) {
                log.error("update monitor job error when template modify: {}.continue", e.getMessage(), e);
            }
        }
    }

    @Override
    public void addAndSaveMonitorJob(Monitor monitor, List<Param> params, String collector, SdMonitorParam sdMonitorParam, GrafanaDashboard grafanaDashboard) {
        // Apply for monitor id
        long monitorId = SnowFlakeIdGenerator.generateId();
        Map<String, String> labels = monitor.getLabels();
        if (labels == null) {
            labels = new HashMap<>(8);
            monitor.setLabels(labels);
        }
        MonitorBind monitorBind = null;
        // Construct the collection task Job entity
        Job appDefine = appService.getAppDefine(monitor.getApp());
        if (Objects.nonNull(sdMonitorParam)) {
            monitorBind = Objects.isNull(sdMonitorParam.getSdParam())
                    ? SdMonitorOperator.buildSdSubMonitorBind(sdMonitorParam, monitorId, labels)
                    : SdMonitorOperator.buildSdMainMonitorBind(sdMonitorParam, monitorId);

            appDefine = SdMonitorOperator.constructSdJobAndTag(sdMonitorParam, labels, appDefine);
        }
        if (CommonConstants.PROMETHEUS.equals(monitor.getApp())) {
            appDefine.setApp(CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName());
        }
        appDefine.setMonitorId(monitorId);
        appDefine.setDefaultInterval(monitor.getIntervals());
        appDefine.setCyclic(true);
        appDefine.setTimestamp(System.currentTimeMillis());
        resetMetricsCommonField(monitor, appDefine, sdMonitorParam);

        List<Configmap> configmaps = params.stream().map(param -> {
            param.setMonitorId(monitorId);
            return new Configmap(param.getField(), param.getParamValue(), param.getType());
        }).collect(Collectors.toList());
        appDefine.setConfigmap(configmaps);

        long jobId = collector == null ? collectJobScheduling.addAsyncCollectJob(appDefine, null) :
                collectJobScheduling.addAsyncCollectJob(appDefine, collector);

        try {
            detectMonitor(monitor, params, collector);
        } catch (Exception ignored) {}

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
            monitor.setStatus(CommonConstants.MONITOR_UP_CODE);
            // create grafana dashboard
            if (monitor.getApp().equals(CommonConstants.PROMETHEUS) && grafanaDashboard != null && grafanaDashboard.isEnabled()) {
                dashboardService.createOrUpdateDashboard(grafanaDashboard.getTemplate(), monitorId);
            }
            monitorDao.save(monitor);
            if (Objects.nonNull(monitorBind)) {
                monitorBindDao.save(monitorBind);
            }
            paramDao.saveAll(params);
        } catch (Exception e) {
            log.error("Error while adding monitor: {}", e.getMessage(), e);
            collectJobScheduling.cancelAsyncCollectJob(jobId);
            throw new MonitorDatabaseException(e.getMessage());
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

    private void resetMetricsCommonField(Monitor monitor, Job appDefine, SdMonitorParam sdMonitorParam) {
        if (Objects.isNull(sdMonitorParam)
                || org.apache.commons.lang3.StringUtils.isAnyBlank(sdMonitorParam.getDetectedHost(), sdMonitorParam.getDetectedPort())) {
            return;
        }

        for (Metrics metric : appDefine.getMetrics()) {
            Arrays.stream(metric.getClass().getDeclaredFields())
                    .filter(field -> metric.getProtocol().equalsIgnoreCase(field.getName()))
                    .findFirst()
                    .ifPresent(field -> {
                        field.setAccessible(true);
                        final Object obj;
                        try {
                            obj = field.get(metric);
                            if (obj instanceof CommonRequestProtocol protocol) {
                                protocol.setHost(sdMonitorParam.getDetectedHost());
                                protocol.setPort(sdMonitorParam.getDetectedPort());
                            }
                        } catch (IllegalAccessException exception) {
                            log.warn("Not such field {}", field.getName());
                        }
                    });
        }

        monitor.setHost(sdMonitorParam.getDetectedHost());
        Map<String, String> labels = monitor.getLabels();
        if (labels == null) {
            labels = new HashMap<>(8);
            monitor.setLabels(labels);
        }
        labels.put(CommonConstants.TAG_MONITOR_HOST, sdMonitorParam.getDetectedHost());
        monitor.setName(monitor.getApp().toUpperCase() + CommonConstants.LOCALE_SEPARATOR + sdMonitorParam.getDetectedHost()
                + CommonConstants.LOCALE_SEPARATOR + SnowFlakeIdGenerator.generateId());
    }

    private void copyMonitor(Monitor monitor, List<Param> params) {
        monitor.setName(String.format("%s - copy", monitor.getName()));
        addMonitor(monitor, params, null, null);
    }

    private void collectOneTimeSdData(Monitor monitor, String collector, Param sdParam) {
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
        final Job sdJob = SdMonitorOperator.constructSdJob(appDefine, sdParam);
        List<CollectRep.MetricsData> collectRep;
        if (collector != null) {
            collectRep = collectJobScheduling.collectSyncJobData(sdJob, collector);
        } else {
            collectRep = collectJobScheduling.collectSyncJobData(sdJob);
        }
        monitor.setStatus(CommonConstants.MONITOR_UP_CODE);

        // If the detection result fails, a detection exception is thrown
        if (collectRep == null || collectRep.isEmpty()) {
            monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
            throw new MonitorDetectException("Collect Timeout No Response");
        }
        if (collectRep.get(0).getCode() != CollectRep.Code.SUCCESS) {
            monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
            throw new MonitorDetectException(collectRep.get(0).getMsg());
        }
        collectRep.forEach(CollectRep.MetricsData::close);
    }

    private void detectMonitorDirectly(Monitor monitor, List<Param> params, String collector) {
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
                new Configmap(param.getField(), param.getParamValue(), param.getType())).collect(Collectors.toList());
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
        monitor.setStatus(CommonConstants.MONITOR_UP_CODE);

        // If the detection result fails, a detection exception is thrown
        if (collectRep == null || collectRep.isEmpty()) {
            monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
            throw new MonitorDetectException("Collect Timeout No Response");
        }
        if (collectRep.get(0).getCode() != CollectRep.Code.SUCCESS) {
            monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
            throw new MonitorDetectException(collectRep.get(0).getMsg());
        }
        collectRep.forEach(CollectRep.MetricsData::close);
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
