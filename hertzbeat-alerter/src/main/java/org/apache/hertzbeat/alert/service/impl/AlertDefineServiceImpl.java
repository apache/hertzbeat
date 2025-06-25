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
import org.apache.hertzbeat.alert.calculate.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.alert.service.AlertDefineImExportService;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.ExportFileConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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
    private PeriodicAlertRuleScheduler periodicAlertRuleScheduler;

    private final DataSourceService dataSourceService;

    private final Map<String, AlertDefineImExportService> alertDefineImExportServiceMap = new HashMap<>();

    private static final String CONTENT_TYPE = MediaType.APPLICATION_OCTET_STREAM_VALUE + SignConstants.SINGLE_MARK + "charset=" + StandardCharsets.UTF_8;

    public AlertDefineServiceImpl(List<AlertDefineImExportService> alertDefineImExportServiceList, DataSourceService dataSourceService) {
        alertDefineImExportServiceList.forEach(it -> alertDefineImExportServiceMap.put(it.type(), it));
        this.dataSourceService = dataSourceService;
    }

    @Override
    public void validate(AlertDefine alertDefine, boolean isModify) throws IllegalArgumentException {
        if (StringUtils.hasText(alertDefine.getExpr())) {
            if (CommonConstants.ALERT_THRESHOLD_TYPE_REALTIME.equals(alertDefine.getType())) {
                try {
                    JexlExpressionRunner.compile(alertDefine.getExpr());
                } catch (Exception e) {
                    throw new IllegalArgumentException("alert expr error: " + e.getMessage());
                }   
            }
        }
        // the name of the alarm rule is unique
        Optional<AlertDefine> optional = alertDefineDao.findAlertDefineByName(alertDefine.getName());
        if (optional.isPresent()) {
            if (!isModify || !optional.get().getId().equals(alertDefine.getId())) {
                throw new IllegalArgumentException("alert name already exists");
            }
        }
    }

    @Override
    public void addAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefine = alertDefineDao.save(alertDefine);
        periodicAlertRuleScheduler.updateSchedule(alertDefine);
        CacheFactory.clearAlertDefineCache();
    }

    @Override
    public void modifyAlertDefine(AlertDefine alertDefine) throws RuntimeException {
        alertDefineDao.save(alertDefine);
        periodicAlertRuleScheduler.updateSchedule(alertDefine);
        CacheFactory.clearAlertDefineCache();
    }

    @Override
    public void deleteAlertDefine(long alertId) throws RuntimeException {
        alertDefineDao.deleteById(alertId);
        periodicAlertRuleScheduler.cancelSchedule(alertId);
        CacheFactory.clearAlertDefineCache();
    }

    @Override
    public AlertDefine getAlertDefine(long alertId) throws RuntimeException {
        Optional<AlertDefine> optional = alertDefineDao.findById(alertId);
        return optional.orElse(null);
    }

    @Override
    public void deleteAlertDefines(Set<Long> alertIds) throws RuntimeException {
        alertDefineDao.deleteAlertDefinesByIdIn(alertIds);
        for (Long alertId : alertIds) {
            periodicAlertRuleScheduler.cancelSchedule(alertId);
        }
        CacheFactory.clearAlertDefineCache();
    }

    @Override
    public Page<AlertDefine> getAlertDefines(List<Long> defineIds, String search, String sort, String order, int pageIndex, int pageSize) {
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
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("expr")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("labels")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("annotations")), "%" + searchContent + "%"),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("template")), "%" + searchContent + "%")
                    );
                    searchPredicates.add(predicate);
                }
                // all search keywords are connected with or
                andList.add(criteriaBuilder.or(searchPredicates.toArray(new Predicate[0])));
            }
            Predicate[] predicates = new Predicate[andList.size()];
            return criteriaBuilder.and(andList.toArray(predicates));
        };
        Sort sortExp = Sort.by(new Sort.Order(Sort.Direction.fromString(order), sort));
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, sortExp);
        return alertDefineDao.findAll(specification, pageRequest);
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

    @Override
    public List<AlertDefine> getRealTimeAlertDefines() {
        List<AlertDefine> alertDefines = CacheFactory.getAlertDefineCache();
        if (alertDefines == null) {
            alertDefines = alertDefineDao.findAlertDefinesByTypeAndEnableTrue(CommonConstants.ALERT_THRESHOLD_TYPE_REALTIME);
            CacheFactory.setAlertDefineCache(alertDefines);
        }
        return alertDefines;
    }

    @Override
    public List<Map<String, Object>> getDefinePreview(String datasource, String type, String expr) {
        if (!StringUtils.hasText(expr) || !StringUtils.hasText(datasource) || !StringUtils.hasText(type)) {
            return Collections.emptyList();
        }
        switch (type) {
            case CommonConstants.ALERT_THRESHOLD_TYPE_PERIODIC:
                return dataSourceService.calculate(datasource, expr);
            default:
                log.error("Get define preview unsupported type: {}", type);
                return Collections.emptyList();
        }
    }
}
