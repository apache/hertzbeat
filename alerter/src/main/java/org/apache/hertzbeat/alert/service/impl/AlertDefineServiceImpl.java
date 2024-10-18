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

package org.apache.hertzbeat.alert.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertDefineBindDao;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.alert.dao.AlertMonitorDao;
import org.apache.hertzbeat.alert.service.AlertDefineImExportService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.util.FileUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Alarm definition management interface implementation
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AlertDefineServiceImpl implements AlertDefineService {

    @Autowired
    private AlertDefineDao alertDefineDao;

    @Autowired
    private AlertDefineBindDao alertDefineBindDao;

    @Autowired
    private AlertMonitorDao alertMonitorDao;

    private final Map<String, AlertDefineImExportService> alertDefineImExportServiceMap = new HashMap<>();

    private static final String CONTENT_TYPE = MediaType.APPLICATION_OCTET_STREAM_VALUE + SignConstants.SINGLE_MARK + "charset=" + StandardCharsets.UTF_8;

    public AlertDefineServiceImpl(List<AlertDefineImExportService> alertDefineImExportServiceList) {
        alertDefineImExportServiceList.forEach(it -> alertDefineImExportServiceMap.put(it.type(), it));
    }

    @Override
    public void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException {
        // todo
        if (StringUtils.hasText(alertDefine.getExpr())) {
            try {
                JexlExpressionRunner.compile(alertDefine.getExpr());
            } catch (Exception e) {
                throw new IllegalArgumentException("alert expr error: " + e.getMessage());
            }
        }
    }

    @Override
    public void addAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
    }

    @Override
    public void deleteAlertDefine(long alertId) throws RuntimeException {
        alertDefineDao.deleteById(alertId);
    }

    @Override
    public AlertDefine getAlertDefine(long alertId) throws RuntimeException {
        Optional<AlertDefine> optional = alertDefineDao.findById(alertId);
        return optional.orElse(null);
    }

    @Override
    public void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException {
        alertDefineDao.deleteAlertDefinesByIdIn(alertIds);
    }

    @Override
    public Page<AlertDefine> getMonitorBindAlertDefines(Specification<AlertDefine> specification, PageRequest pageRequest) {
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public void applyBindAlertDefineMonitors(Long alertId, List<AlertDefineMonitorBind> alertDefineBinds) {
        // todo checks whether the alarm definition and monitoring exist
        if (!alertDefineBindDao.existsById(alertId)){
            alertDefineBindDao.deleteAlertDefineBindsByAlertDefineIdEquals(alertId);
        }
        // Delete all associations of this alarm
        alertDefineBindDao.deleteAlertDefineBindsByAlertDefineIdEquals(alertId);
        // Save the associated
        alertDefineBindDao.saveAll(alertDefineBinds);
    }

    @Override
    public Map<String, List<AlertDefine>> getMonitorBindAlertDefines(long monitorId, String app, String metrics) {
        List<AlertDefine> defines = alertDefineDao.queryAlertDefinesByMonitor(monitorId, app, metrics);
        List<AlertDefine> defaultDefines = alertDefineDao.queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue(app, metrics);
        defines.addAll(defaultDefines);
        Set<AlertDefine> defineSet = defines.stream().filter(item -> item.getField() != null).collect(Collectors.toSet());
        // The alarm thresholds are defined in ascending order of the alarm severity from 0 to 3.
        // The lower the number, the higher the alarm is. That is, the alarm is calculated from the highest alarm threshold
        return defineSet.stream().sorted(Comparator.comparing(AlertDefine::getPriority))
                .collect(Collectors.groupingBy(AlertDefine::getField));
    }

    @Override
    public AlertDefine getMonitorBindAlertAvaDefine(long monitorId, String app, String metrics) {
        List<AlertDefine> defines = alertDefineDao.queryAlertDefinesByMonitor(monitorId, app, metrics);
        List<AlertDefine> defaultDefines = alertDefineDao.queryAlertDefinesByAppAndMetricAndPresetTrueAndEnableTrue(app, metrics);
        defines.addAll(defaultDefines);
        return defines.stream().findFirst().orElse(null);
    }

    @Override
    public Page<AlertDefine> getAlertDefines(List<Long> defineIds, String search, Byte priority, String sort, String order, int pageIndex, int pageSize) {
        // parse translation content list
        ObjectMapper objectMapper = new ObjectMapper();
        List<String> searchList = Collections.emptyList();
        if (StringUtils.hasText(search)) {
            try {
                searchList = objectMapper.readValue(URLDecoder.decode(search, StandardCharsets.UTF_8), new TypeReference<>() {});
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("Failed to parse search parameter", e);
            }
        }
        List<String> finalSearchList = searchList;
        // build search condition
        Specification<AlertDefine> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> andList = new ArrayList<>();
            if (defineIds != null && !defineIds.isEmpty()) {
                CriteriaBuilder.In<Long> inPredicate = criteriaBuilder.in(root.get("id"));
                for (long id : defineIds) {
                    inPredicate.value(id);
                }
                andList.add(inPredicate);
            }
            if (null != finalSearchList && !finalSearchList.isEmpty()) {
                List<Predicate> searchPredicates = new ArrayList<>();
                for (String searchContent : finalSearchList) {
                    searchContent = searchContent.toLowerCase();
                    Predicate predicate = criteriaBuilder.or(
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("app")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("metric")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("field")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("expr")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("template")), "%" + searchContent + "%")
                    );
                    searchPredicates.add(predicate);
                }
                // all search keywords are connected with or
                andList.add(criteriaBuilder.or(searchPredicates.toArray(new Predicate[0])));
            }
            if (priority != null) {
                Predicate predicate = criteriaBuilder.equal(root.get("priority"), priority);
                andList.add(predicate);
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return alertDefineDao.findAll(specification, pageRequest);
    }

    @Override
    public List<AlertDefineMonitorBind> getBindAlertDefineMonitors(long alertDefineId) {
        List<AlertDefineMonitorBind> defineMonitorBinds = alertDefineBindDao.getAlertDefineBindsByAlertDefineIdEquals(alertDefineId);
        if (defineMonitorBinds == null || defineMonitorBinds.isEmpty()) {
            return defineMonitorBinds;
        }
        List<Long> needLoadMonitorIds = defineMonitorBinds.stream()
                .filter(bind -> bind.getMonitor() == null)
                .map(AlertDefineMonitorBind::getMonitorId).toList();
        if (needLoadMonitorIds.isEmpty()) {
            return defineMonitorBinds;
        }
        Map<Long, Monitor> monitorMap = alertMonitorDao.findAllById(needLoadMonitorIds)
                .stream().collect(Collectors.toMap(Monitor::getId, Function.identity()));
        for (AlertDefineMonitorBind bind : defineMonitorBinds) {
            if (bind.getMonitor() == null) {
                bind.setMonitor(monitorMap.get(bind.getMonitorId()));
            }
        }
        return defineMonitorBinds;
    }

    @Override
    public void export(List<Long> ids, String type, HttpServletResponse res) throws Exception {
        var imExportService = alertDefineImExportServiceMap.get(type);
        if (imExportService == null) {
            throw new IllegalArgumentException("not support export type: " + type);
        }
        var fileName = imExportService.getFileName();
        res.setHeader(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE);
        res.setContentType(CONTENT_TYPE);
        res.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment;filename=" + URLEncoder.encode(fileName, StandardCharsets.UTF_8));
        res.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION);
        imExportService.exportConfig(res.getOutputStream(), ids);
    }

    @Override
    public void importConfig(MultipartFile file) throws Exception {

        var type = FileUtil.getFileType(file);
        var fileName = FileUtil.getFileName(file);
        if (!alertDefineImExportServiceMap.containsKey(type)) {
            throw new RuntimeException(ExportFileConstants.FILE + " " + fileName + " is not supported.");
        }
        var imExportService = alertDefineImExportServiceMap.get(type);
        imExportService.importConfig(file.getInputStream());
    }
}
