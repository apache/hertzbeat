/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.RuntimeParamDefine;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.HertzBeatKeywordsUtil;
import org.apache.hertzbeat.common.util.JexlCheckerUtil;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.pojo.dto.ParamDefineInfo;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObjectStoreService;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.util.StreamUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static java.util.Objects.isNull;

/**
 * Monitoring Type Management Implementation
 * Temporarily stores the monitoring configuration and parameter configuration in memory,
 * and then persists it to a storage system.
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class AppServiceImpl implements AppService, InitializingBean {

    private static final String PUSH_PROTOCOL_METRICS_NAME = "metrics";

    private final MonitorDao monitorDao;
    private final ObjectStoreConfigServiceImpl objectStoreConfigService;
    private final ParamDao paramDao;
    private final DefineDao defineDao;
    private final WarehouseService warehouseService;
    private final ObjectProvider<MonitorService> monitorServiceProvider;
    private final ObjectProvider<ObjectStoreService> objectStoreServiceProvider;

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();
    private AppDefineStore appDefineStore;
    private final AppDefineStore jarAppDefineStore = new JarAppDefineStoreImpl();

    /**
     * warehouseService is marked @Lazy to prevent potential circular dependencies.
     */
    public AppServiceImpl(MonitorDao monitorDao,
                          ObjectStoreConfigServiceImpl objectStoreConfigService,
                          ParamDao paramDao,
                          DefineDao defineDao,
                          @Lazy WarehouseService warehouseService,
                          ObjectProvider<MonitorService> monitorServiceProvider,
                          ObjectProvider<ObjectStoreService> objectStoreServiceProvider) {
        this.monitorDao = monitorDao;
        this.objectStoreConfigService = objectStoreConfigService;
        this.paramDao = paramDao;
        this.defineDao = defineDao;
        this.warehouseService = warehouseService;
        this.monitorServiceProvider = monitorServiceProvider;
        this.objectStoreServiceProvider = objectStoreServiceProvider;
    }

    @Override
    public List<ParamDefineInfo> getAppParamDefines(String app) {
        if (StringUtils.isNotBlank(app)){
            var appDefine = appDefines.get(app.toLowerCase());
            if (appDefine != null && appDefine.getParams() != null) {
                return appDefine.getParams().stream().map(ParamDefineInfo::fromRuntime).toList();
            }
        }
        return Collections.emptyList();
    }

    @Override
    public Job getPushDefine(Long monitorId) throws IllegalArgumentException {
        Job appDefine = appDefines.get(DispatchConstants.PROTOCOL_PUSH);
        if (appDefine == null) {
            throw new IllegalArgumentException("The push collector not support.");
        }
        List<Metrics> metrics = appDefine.getMetrics();
        List<Metrics> metricsTmp = new ArrayList<>();
        for (Metrics metric : metrics) {
            if (PUSH_PROTOCOL_METRICS_NAME.equals(metric.getName())) {
                List<Param> params = paramDao.findParamsByMonitorId(monitorId);
                List<Configmap> configmaps = params.stream()
                    .map(param -> new Configmap(param.getField(), param.getParamValue(),
                        param.getType())).toList();
                Map<String, Configmap> configmap = configmaps.stream().collect(Collectors.toMap(Configmap::getKey, item -> item, (key1, key2) -> key1));
                CollectUtil.replaceFieldsForPushStyleMonitor(metric, configmap);
                metricsTmp.add(metric);
            }
        }
        appDefine.setMetrics(metricsTmp);
        return appDefine;
    }

    @Override
    public Job getAutoGenerateDynamicDefine(Long monitorId) {
        Job job = getAppDefine(DispatchConstants.PROTOCOL_PROMETHEUS);
        List<CollectRep.MetricsData> metricsDataList = warehouseService.queryMonitorMetricsData(monitorId);
        Metrics tmpMetrics = job.getMetrics().get(0);
        List<Metrics> metricsList = new LinkedList<>();
        for (CollectRep.MetricsData metricsData : metricsDataList) {
            List<Metrics.Field> fields = metricsData.getFields().stream().map(item ->
                    Metrics.Field.builder()
                        .field(item.getName())
                        .type((byte) item.getType())
                        .label(item.getLabel())
                        .unit(item.getUnit())
                        .build())
                .collect(Collectors.toList());
            Metrics metrics = Metrics.builder()
                .visible(true)
                .name(metricsData.getMetrics())
                .fields(fields)
                .prometheus(tmpMetrics.getPrometheus())
                .build();
            metricsList.add(metrics);
        }
        job.setMetrics(metricsList);
        return job;
    }

    @Override
    public Job getAppDefine(String app) throws IllegalArgumentException {
        if (StringUtils.isBlank(app)) {
            throw new IllegalArgumentException("The app can not null.");
        }
        var appDefine = appDefines.get(app.toLowerCase());
        if (appDefine == null) {
            throw new IllegalArgumentException("The app " + app + " not support.");
        }
        return appDefine.clone();
    }

    @Override
    public Optional<Job> getAppDefineOption(String app) {
        if (StringUtils.isNotBlank(app)) {
            Job appDefine = appDefines.get(app.toLowerCase());
            return Optional.ofNullable(appDefine);
        }
        return Optional.empty();
    }

    @Override
    public List<String> getAppDefineMetricNames(String app) {
        List<String> metricNames = new ArrayList<>(16);
        if (StringUtils.isNotBlank(app)) {
            var appDefine = appDefines.get(app.toLowerCase());
            if (appDefine == null) {
                throw new IllegalArgumentException("The app " + app + " not support.");
            }
            metricNames.addAll(appDefine.getMetrics().stream().map(Metrics::getName).toList());
        } else {
            appDefines.forEach((k, v) ->
                metricNames.addAll(v.getMetrics().stream().map(Metrics::getName).toList()));
        }
        return metricNames;
    }

    @Override
    public Map<String, String> getI18nResources(String lang) {
        Map<String, String> i18nMap = new HashMap<>(128);
        for (var job : appDefines.values()) {
            var name = job.getName();
            var i18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, name);
            if (i18nName != null) {
                i18nMap.put("monitor.app." + job.getApp(), i18nName);
            }
            var help = job.getHelp();
            var i18nHelp = CommonUtil.getLangMappingValueFromI18nMap(lang, help);
            if (i18nHelp != null) {
                i18nMap.put("monitor.app." + job.getApp() + ".help", i18nHelp);
            }

            var helpLink = job.getHelpLink();
            var i18nHelpLink = CommonUtil.getLangMappingValueFromI18nMap(lang, helpLink);
            if (i18nHelpLink != null) {
                i18nMap.put("monitor.app." + job.getApp() + ".helpLink", i18nHelpLink);
            }

            for (var paramDefine : job.getParams()) {
                var paramDefineName = paramDefine.getName();
                var i18nParamName = CommonUtil.getLangMappingValueFromI18nMap(lang, paramDefineName);
                if (i18nParamName != null) {
                    i18nMap.put("monitor.app." + job.getApp() + ".param." + paramDefine.getField(), i18nParamName);
                }
            }
            for (var metrics : job.getMetrics()) {
                var metricsI18nName = metrics.getI18n();
                var i18nMetricsName = CommonUtil.getLangMappingValueFromI18nMap(lang, metricsI18nName);
                if (i18nMetricsName != null) {
                    i18nMap.put("monitor.app." + job.getApp() + ".metrics." + metrics.getName(), i18nMetricsName);
                }
                if (metrics.getFields() == null) {
                    continue;
                }
                for (var field : metrics.getFields()) {
                    var fieldI18nName = field.getI18n();
                    var i18nMetricName = CommonUtil.getLangMappingValueFromI18nMap(lang, fieldI18nName);
                    if (i18nMetricName != null) {
                        i18nMap.put("monitor.app." + job.getApp() + ".metrics." + metrics.getName() + ".metric." + field.getField(), i18nMetricName);
                    }
                }
            }
        }
        return i18nMap;
    }

    @Override
    public Map<String, String> getI18nApps(String lang) {
        Map<String, String> i18nMap = new HashMap<>(128);
        for (var job : appDefines.values()) {
            var name = job.getName();
            var i18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, name);
            if (i18nName != null) {
                i18nMap.put(job.getApp(), i18nName);
            }
        }
        return i18nMap;
    }

    @Override
    public List<Hierarchy> getAllAppHierarchy(String lang) {
        LinkedList<Hierarchy> hierarchies = new LinkedList<>();
        for (var job : appDefines.values()) {
            queryAppHierarchy(lang, hierarchies, job);
        }
        return hierarchies;
    }

    @Override
    public List<Hierarchy> getAppHierarchy(String app, String lang) {
        LinkedList<Hierarchy> hierarchies = new LinkedList<>();
        Job job = appDefines.get(app.toLowerCase());
        if (DispatchConstants.PROTOCOL_PUSH.equalsIgnoreCase(job.getApp())) {
            return hierarchies;
        }
        queryAppHierarchy(lang, hierarchies, job);
        return hierarchies;
    }

    private void queryAppHierarchy(String lang, LinkedList<Hierarchy> hierarchies, Job job) {
        var hierarchyApp = new Hierarchy();
        hierarchyApp.setCategory(job.getCategory());
        hierarchyApp.setValue(job.getApp());
        hierarchyApp.setHide(job.isHide());
        var nameMap = job.getName();
        if (nameMap != null && !nameMap.isEmpty()) {
            var i18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, nameMap);
            if (i18nName != null) {
                hierarchyApp.setLabel(i18nName);
            }
        }
        List<Hierarchy> hierarchyMetricList = new LinkedList<>();
        if (DispatchConstants.PROTOCOL_PROMETHEUS.equalsIgnoreCase(job.getApp())) {
            List<Monitor> monitors = monitorDao.findMonitorsByAppEquals(job.getApp());
            for (Monitor monitor : monitors) {
                List<CollectRep.MetricsData> metricsDataList = warehouseService.queryMonitorMetricsData(monitor.getId());
                for (CollectRep.MetricsData metricsData : metricsDataList) {
                    var hierarchyMetric = new Hierarchy();
                    hierarchyMetric.setValue(metricsData.getMetrics());
                    hierarchyMetric.setLabel(metricsData.getMetrics());
                    List<Hierarchy> hierarchyFieldList = metricsData.getFields().stream()
                        .map(item -> {
                            var hierarchyField = new Hierarchy();
                            hierarchyField.setValue(item.getName());
                            hierarchyField.setLabel(item.getName());
                            hierarchyField.setIsLeaf(true);
                            hierarchyField.setType((byte) item.getType());
                            hierarchyField.setUnit(item.getUnit());
                            return hierarchyField;
                        }).collect(Collectors.toList());
                    hierarchyMetric.setChildren(hierarchyFieldList);
                    combineHierarchyMetrics(hierarchyMetricList, hierarchyMetric);
                }
            }
            hierarchyApp.setChildren(hierarchyMetricList);
            hierarchies.addFirst(hierarchyApp);
        } else {
            if (job.getMetrics() != null) {
                for (var metrics : job.getMetrics()) {
                    var hierarchyMetric = new Hierarchy();
                    hierarchyMetric.setValue(metrics.getName());
                    var metricsI18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, metrics.getI18n());
                    hierarchyMetric.setLabel(metricsI18nName != null ? metricsI18nName : metrics.getName());
                    List<Hierarchy> hierarchyFieldList = new LinkedList<>();
                    if (metrics.getFields() != null) {
                        for (var field : metrics.getFields()) {
                            var hierarchyField = new Hierarchy();
                            hierarchyField.setValue(field.getField());
                            var metricI18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, field.getI18n());
                            hierarchyField.setLabel(metricI18nName != null ? metricI18nName : field.getField());
                            hierarchyField.setIsLeaf(true);
                            hierarchyField.setType(field.getType());
                            hierarchyField.setUnit(field.getUnit());
                            hierarchyFieldList.add(hierarchyField);
                        }
                        hierarchyMetric.setChildren(hierarchyFieldList);
                    }
                    hierarchyMetricList.add(hierarchyMetric);
                }
            }
            hierarchyApp.setChildren(hierarchyMetricList);
            hierarchies.add(hierarchyApp);
        }
    }

    private void combineHierarchyMetrics(List<Hierarchy> hierarchyMetricList, Hierarchy hierarchyMetric) {
        Optional<Hierarchy> preHierarchyOptional = hierarchyMetricList.stream()
            .filter(item -> item.getValue().equals(hierarchyMetric.getValue()))
            .findFirst();

        if (preHierarchyOptional.isPresent()) {
            Hierarchy preHierarchy = preHierarchyOptional.get();
            List<Hierarchy> children = preHierarchy.getChildren();
            Set<String> childrenKey = children.stream()
                .map(Hierarchy::getValue)
                .collect(Collectors.toSet());

            for (Hierarchy child : hierarchyMetric.getChildren()) {
                if (!childrenKey.contains(child.getValue())) {
                    children.add(child);
                }
            }
        } else {
            hierarchyMetricList.add(hierarchyMetric);
        }
    }

    @Override
    public Map<String, Job> getAllAppDefines() {
        return appDefines;
    }

    @Override
    public String getMonitorDefineFileContent(String app) {
        var appDefine = appDefineStore.loadAppDefine(app);
        if (isNull(appDefine)) {
            appDefine = jarAppDefineStore.loadAppDefine(app);
        }
        if (isNull(appDefine)) {
            throw new IllegalArgumentException("can not find " + app + " define yml");
        }
        return appDefine;
    }

    @Override
    public void applyMonitorDefineYml(String ymlContent, boolean isModify) {
        var yaml = new Yaml();
        Job app;
        try {
            app = yaml.loadAs(ymlContent, Job.class);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new IllegalArgumentException("parse yml error: " + e.getMessage());
        }
        verifyDefineAppContent(app, isModify);
        appDefineStore.save(app.getApp(), ymlContent);
        Job originalJob = appDefines.get(app.getApp().toLowerCase());
        if (Objects.nonNull(originalJob)) {
            boolean hide = originalJob.isHide();
            app.setHide(hide);
        }
        appDefines.put(app.getApp().toLowerCase(), app);
        getMonitorService().updateAppCollectJob(app);
    }

    private void verifyDefineAppContent(Job app, boolean isModify) {
        Assert.notNull(app, "monitoring template can not null");
        Assert.notNull(app.getApp(), "monitoring template require attributes app");
        Assert.notNull(app.getCategory(), "monitoring template require attributes category");
        Assert.notEmpty(app.getName(), "monitoring template require attributes name");
        Assert.notEmpty(app.getParams(), "monitoring template require attributes params");
        var hasParamHost = app.getParams().stream().anyMatch(item -> "host".equals(item.getField()));
        Assert.isTrue(hasParamHost, "monitoring template attributes params must have param host");
        Assert.notEmpty(app.getMetrics(), "monitoring template require attributes metrics");
        var hasAvailableMetrics = app.getMetrics().stream().anyMatch(item -> item.getPriority() == 0);
        Assert.isTrue(hasAvailableMetrics, "monitoring template metrics list must have one priority 0 metrics");
        CommonUtil.validDefineI18n(app.getName(), "name");
        CommonUtil.validDefineI18n(app.getHelp(), "help");
        CommonUtil.validDefineI18n(app.getHelpLink(), "helpLink");
        for (RuntimeParamDefine param : app.getParams()) {
            CommonUtil.validDefineI18n(param.getName(),  param.getField() + " param");
        }
        if (!isModify) {
            Assert.isNull(appDefines.get(app.getApp().toLowerCase()),
                "monitoring template name " + app.getApp() + " already exists.");
        }
        Set<String> fieldsSet = new HashSet<>(16);
        for (Metrics metrics : app.getMetrics()) {
            CommonUtil.validDefineI18n(metrics.getI18n(), metrics.getName() + " metric");
            Assert.notEmpty(metrics.getFields(), "monitoring template metrics fields can not null");
            fieldsSet.clear();
            for (Metrics.Field field : metrics.getFields()) {
                CommonUtil.validDefineI18n(field.getI18n(), metrics.getName() + " metric " + field.getField() + " field");
                HertzBeatKeywordsUtil.verifyKeywords(field.getField());
                if (fieldsSet.contains(field.getField())) {
                    throw new IllegalArgumentException(app.getApp() + " " + metrics.getName() + " "
                        + field.getField() + " can not duplicated.");
                }
                if (JexlCheckerUtil.verifyKeywords(field.getField())) {
                    throw new IllegalArgumentException(app.getApp() + " " + metrics.getName() + " "
                        + field.getField() + " prohibited keywords.");
                }
                if (JexlCheckerUtil.verifyStartCharacter(field.getField())) {
                    throw new IllegalArgumentException(app.getApp() + " " + metrics.getName() + " "
                        + field.getField() + " illegal start character.");
                }
                if (JexlCheckerUtil.verifySpaces(field.getField())) {
                    throw new IllegalArgumentException(app.getApp() + " " + metrics.getName() + " "
                        + field.getField() + " no spaces allowed.");
                }
                fieldsSet.add(field.getField());
            }
        }
    }

    private MonitorService getMonitorService() {
        if (monitorServiceProvider == null) {
            throw new IllegalStateException("MonitorService provider is not available.");
        }
        MonitorService monitorService = monitorServiceProvider.getIfAvailable();
        if (monitorService == null) {
            throw new IllegalStateException("MonitorService bean is not available.");
        }
        return monitorService;
    }

    private ObjectStoreService getObjectStoreService() {
        if (objectStoreServiceProvider == null) {
            throw new IllegalStateException("ObjectStoreService provider is not available.");
        }
        ObjectStoreService objectStoreService = objectStoreServiceProvider.getIfAvailable();
        if (objectStoreService == null) {
            throw new IllegalStateException("ObjectStoreService bean is not available.");
        }
        return objectStoreService;
    }

    @Override
    public void deleteMonitorDefine(String app) {
        var monitors = monitorDao.findMonitorsByAppEquals(app);
        if (monitors != null && !monitors.isEmpty()) {
            throw new IllegalArgumentException("Can not delete define which has monitoring instances.");
        }
        appDefineStore.delete(app);
    }

    @Override
    public void updateCustomTemplateConfig(TemplateConfig config) {
        if (config == null) {
            return;
        }
        Map<String, TemplateConfig.AppTemplate> templateMap = config.getApps();
        if (templateMap == null || templateMap.isEmpty()) {
            return;
        }
        for (var entry : templateMap.entrySet()) {
            var app = entry.getKey().toLowerCase();
            var appTemplate = entry.getValue();
            if (appTemplate == null) {
                continue;
            }
            var appDefine = appDefines.get(app);
            if (appDefine == null) {
                continue;
            }
            appDefine.setHide(appTemplate.isHide());
        }
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        // Guaranteed to be non-null due to constructor injection
        var objectStoreConfig = objectStoreConfigService.getConfig();
        refreshStore(objectStoreConfig);
    }

    @EventListener(ObjectStoreConfigChangeEvent.class)
    public void onObjectStoreConfigChange(ObjectStoreConfigChangeEvent event) {
        refreshStore(event.getConfig());
    }

    private void refreshStore(ObjectStoreDTO<?> objectStoreConfig) {
        if (objectStoreConfig == null) {
            appDefineStore = new DatabaseAppDefineStoreImpl();
        } else {
            if (objectStoreConfig.getType() == ObjectStoreDTO.Type.OBS) {
                appDefineStore = new ObjectStoreAppDefineStoreImpl();
            } else if (objectStoreConfig.getType() == ObjectStoreDTO.Type.DATABASE) {
                appDefineStore = new DatabaseAppDefineStoreImpl();
            } else {
                appDefineStore = new LocalFileAppDefineStoreImpl();
            }
        }
        jarAppDefineStore.loadAppDefines();
        appDefineStore.loadAppDefines();
    }

    private interface AppDefineStore {

        /**
         * The configuration of all collection tasks is loaded
         *
         */
        boolean loadAppDefines();

        /**
         * Load a collection task configuration
         *
         * @param app app name
         * @return collect task configuration text
         */
        String loadAppDefine(String app);

        void save(String app, String ymlContent);

        void delete(String app);
    }

    private class JarAppDefineStoreImpl implements AppDefineStore {
        @Override
        public boolean loadAppDefines() {
            try {
                Yaml yaml = new Yaml();
                log.info("load define app yml in internal jar");
                var resolver = new PathMatchingResourcePatternResolver();
                var resources = resolver.getResources("classpath:define/*.yml");
                for (var resource : resources) {
                    try (var inputStream = resource.getInputStream()) {
                        var app = yaml.loadAs(inputStream, Job.class);
                        appDefines.put(app.getApp().toLowerCase(), app);
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                    }
                }
                return true;
            } catch (IOException e) {
                log.error("define app yml not exist");
                return false;
            }
        }

        @Override
        public String loadAppDefine(String app) {
            var resolver = new PathMatchingResourcePatternResolver();
            var resource = resolver.getResource("classpath:define/app-" + app + ".yml");
            try (var inputStream = resource.getInputStream()) {
                return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.error(e.getMessage());
                return null;
            }
        }

        @Override
        public void save(String app, String ymlContent) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void delete(String app) {
            throw new UnsupportedOperationException();
        }
    }

    private class LocalFileAppDefineStoreImpl implements AppDefineStore {
        @Override
        public boolean loadAppDefines() {
            var rootUrl = this.getClass().getClassLoader().getResource("");
            if (rootUrl == null) return false;
            var directory = new File(rootUrl.getPath() + "define");
            if (!directory.exists()) return false;
            Yaml yaml = new Yaml();
            for (var appFile : Objects.requireNonNull(directory.listFiles())) {
                if (appFile.isFile() && (appFile.getName().endsWith("yml") || appFile.getName().endsWith("yaml"))) {
                    try (var is = new FileInputStream(appFile)) {
                        var app = yaml.loadAs(is, Job.class);
                        if (app != null) appDefines.put(app.getApp().toLowerCase(), app);
                    } catch (Exception e) {
                        log.error(e.getMessage());
                    }
                }
            }
            return true;
        }

        @Override
        public String loadAppDefine(String app) {
            var rootUrl = this.getClass().getClassLoader().getResource("");
            if (rootUrl == null) return null;
            var file = new File(rootUrl.getPath() + "define" + File.separator + "app-" + app + ".yml");
            try {
                return file.exists() ? FileUtils.readFileToString(file, StandardCharsets.UTF_8) : null;
            } catch (Exception e) {
                return null;
            }
        }

        @Override
        public void save(String app, String ymlContent) {
            var rootUrl = this.getClass().getClassLoader().getResource("");
            if (rootUrl == null) return;
            var file = new File(rootUrl.getPath() + "define" + File.separator + "app-" + app + ".yml");
            try {
                FileUtils.writeStringToFile(file, ymlContent, StandardCharsets.UTF_8, false);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        @Override
        public void delete(String app) {
            var rootUrl = this.getClass().getClassLoader().getResource("");
            if (rootUrl == null) return;
            var file = new File(rootUrl.getPath() + "define" + File.separator + "app-" + app + ".yml");
            if (file.exists()) file.delete();
            appDefines.remove(app.toLowerCase());
        }
    }

    private class ObjectStoreAppDefineStoreImpl implements AppDefineStore {
        @Override
        public boolean loadAppDefines() {
            var objectStoreService = getObjectStoreService();
            Yaml yaml = new Yaml();
            objectStoreService.list("define").forEach(it -> {
                if (it.getInputStream() != null) {
                    var app = yaml.loadAs(it.getInputStream(), Job.class);
                    if (app != null) appDefines.put(app.getApp().toLowerCase(), app);
                }
            });
            return true;
        }

        @Override
        public String loadAppDefine(String app) {
            var objectStoreService = getObjectStoreService();
            var file = objectStoreService.download("define/app-" + app + ".yml");
            try {
                return file != null ? IOUtils.toString(file.getInputStream(), StandardCharsets.UTF_8) : null;
            } catch (IOException e) {
                return null;
            }
        }

        @Override
        public void save(String app, String ymlContent) {
            getObjectStoreService().upload("define/app-" + app + ".yml", IOUtils.toInputStream(ymlContent, StandardCharsets.UTF_8));
        }

        @Override
        public void delete(String app) {
            getObjectStoreService().remove("define/app-" + app + ".yml");
            appDefines.remove(app.toLowerCase());
        }
    }

    private class DatabaseAppDefineStoreImpl implements AppDefineStore {
        @Override
        public boolean loadAppDefines() {
            Yaml yaml = new Yaml();
            defineDao.findAll().forEach(define -> {
                var app = yaml.loadAs(define.getContent(), Job.class);
                if (app != null) appDefines.put(define.getApp().toLowerCase(), app);
            });
            return true;
        }

        @Override
        public String loadAppDefine(String app) {
            return defineDao.findById(app).map(Define::getContent).orElse(null);
        }

        @Override
        public void save(String app, String ymlContent) {
            Define define = new Define();
            define.setApp(app);
            define.setContent(ymlContent);
            defineDao.save(define);
        }

        @Override
        public void delete(String app) {
            defineDao.deleteById(app);
            appDefines.remove(app.toLowerCase());
        }
    }
}
