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

import static java.util.Objects.isNull;
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
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.manager.Define;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.manager.dao.DefineDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.pojo.dto.Hierarchy;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigChangeEvent;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.apache.hertzbeat.manager.pojo.dto.TemplateConfig;
import org.apache.hertzbeat.manager.service.AppService;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.service.ObjectStoreService;
import org.apache.hertzbeat.warehouse.service.WarehouseService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.util.StreamUtils;
import org.yaml.snakeyaml.Yaml;

/**
 * Monitoring Type Management Implementation
 * temporarily stores the monitoring configuration and parameter configuration in memory and then stores it in the
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class AppServiceImpl implements AppService, CommandLineRunner {

    private static final String PUSH_PROTOCOL_METRICS_NAME = "metrics";

    @Resource
    private MonitorDao monitorDao;

    @Resource
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @Resource
    private ParamDao paramDao;

    @Resource
    private DefineDao defineDao;
    
    @Resource
    private WarehouseService warehouseService;

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();

    private AppDefineStore appDefineStore;
    private final AppDefineStore jarAppDefineStore = new JarAppDefineStoreImpl();

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {
        if (StringUtils.isNotBlank(app)){
            var appDefine = appDefines.get(app.toLowerCase());
            if (appDefine != null && appDefine.getParams() != null) {
                return appDefine.getParams();
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
        // todo now only for prometheus
        Job job = getAppDefine(DispatchConstants.PROTOCOL_PROMETHEUS);
        List<CollectRep.MetricsData> metricsDataList = warehouseService.queryMonitorMetricsData(monitorId);
        Metrics tmpMetrics = job.getMetrics().get(0);
        List<Metrics> metricsList = new LinkedList<>();
        for (CollectRep.MetricsData metricsData : metricsDataList) {
            List<Metrics.Field> fields = metricsData.getFieldsList().stream().map(item ->
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
                i18nMap.put("monitor.app." + job.getApp().toLowerCase(), i18nName);
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
            // TODO temporarily filter out push to solve the front-end problem, and open it after the subsequent design optimization
            if (DispatchConstants.PROTOCOL_PUSH.equalsIgnoreCase(job.getApp())) {
                continue;
            }
            queryAppHierarchy(lang, hierarchies, job);
        }
        return hierarchies;
    }

    @Override
    public List<Hierarchy> getAppHierarchy(String app, String lang) {
        LinkedList<Hierarchy> hierarchies = new LinkedList<>();
        Job job = appDefines.get(app.toLowerCase());
        // TODO temporarily filter out push to solve the front-end problem, and open it after the subsequent design optimization
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
                    List<Hierarchy> hierarchyFieldList = metricsData.getFieldsList().stream()
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
                    // combine Hierarchy Metrics
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
                            // for metric
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
        // app params verify
        verifyDefineAppContent(app, isModify);
        appDefineStore.save(app.getApp(), ymlContent);
        // get and reset hide value
        Job originalJob = appDefines.get(app.getApp().toLowerCase());
        if (Objects.nonNull(originalJob)) {
            boolean hide = originalJob.isHide();
            app.setHide(hide);
        }
        
        appDefines.put(app.getApp().toLowerCase(), app);
        // resolve: after the template is modified, all monitoring instances of the same type of template need to be reissued in the task status
        SpringContextHolder.getBean(MonitorService.class).updateAppCollectJob(app);
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
        for (ParamDefine param : app.getParams()) {
            CommonUtil.validDefineI18n(param.getName(),  param.getField() + " param");
        }
        for (Metrics metric : app.getMetrics()) {
            CommonUtil.validDefineI18n(metric.getI18n(), metric.getName() + " metric");
            if (metric.getFields() == null){
                continue;
            }
            for (Metrics.Field field : metric.getFields()) {
                CommonUtil.validDefineI18n(field.getI18n(), metric.getName() + " metric " + field.getField() + " field");
            }
        }
        if (!isModify) {
            Assert.isNull(appDefines.get(app.getApp().toLowerCase()),
                    "monitoring template name " + app.getApp() + " already exists.");
        }
        Set<String> fieldsSet = new HashSet<>(16);
        for (Metrics metrics : app.getMetrics()) {
            Assert.notEmpty(metrics.getFields(), "monitoring template metrics fields can not null");
            fieldsSet.clear();
            for (Metrics.Field field : metrics.getFields()) {
                if (fieldsSet.contains(field.getField())) {
                    throw new IllegalArgumentException(app.getApp() + " " + metrics.getName() + " " 
                            + field.getField() + " can not duplicated.");
                }
                fieldsSet.add(field.getField());
            }
        }
    }

    @Override
    public void deleteMonitorDefine(String app) {
        // if app has monitors now, delete failed
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
    public void run(String... args) throws Exception {
        var objectStoreConfig = objectStoreConfigService.getConfig();
        refreshStore(objectStoreConfig);
    }

    @EventListener(ObjectStoreConfigChangeEvent.class)
    public void onObjectStoreConfigChange(ObjectStoreConfigChangeEvent event) {
        refreshStore(event.getConfig());
    }

    /**
     * flush config store
     *
     * @param objectStoreConfig file service configuration
     */
    private void refreshStore(ObjectStoreDTO<?> objectStoreConfig) {
        if (objectStoreConfig == null) {
            appDefineStore = new LocalFileAppDefineStoreImpl();
        } else {
            if (objectStoreConfig.getType() == ObjectStoreDTO.Type.OBS) {
                appDefineStore = new ObjectStoreAppDefineStoreImpl();
            } else if (objectStoreConfig.getType() == ObjectStoreDTO.Type.DATABASE){
                appDefineStore = new DatabaseAppDefineStoreImpl();
            } else {
                appDefineStore = new LocalFileAppDefineStoreImpl();
            }
        }
        var success = appDefineStore.loadAppDefines();
        if (!success) {
            new JarAppDefineStoreImpl().loadAppDefines();
        }
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
                        log.error("Ignore this template file: {}.", resource.getFilename());
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
            // load define app yml in jar
            log.info("load define app yml in internal jar");
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
            throw new UnsupportedOperationException("define yml inside jars cannot be deleted");
        }

    }

    private class LocalFileAppDefineStoreImpl implements AppDefineStore {

        @Override
        public boolean loadAppDefines() {
            var rootUrl = this.getClass().getClassLoader().getResource("");
            if (rootUrl == null) {
                return false;
            }
            var classpath = rootUrl.getPath();
            var defineAppPath = classpath + "define";
            var directory = new File(defineAppPath);
            if (!directory.exists() || directory.listFiles() == null) {
                rootUrl = this.getClass().getResource(File.separator);
                if (rootUrl == null) {
                    return false;
                }
                classpath = rootUrl.getPath();
                defineAppPath = classpath + "define";
                directory = new File(defineAppPath);
                if (!directory.exists() || directory.listFiles() == null) {
                    return false;
                }
            }
            log.info("load define path {}", defineAppPath);
            Yaml yaml = new Yaml();
            for (var appFile : Objects.requireNonNull(directory.listFiles())) {
                if (appFile.exists() && appFile.isFile()) {
                    if (appFile.isHidden()
                            || (!appFile.getName().endsWith("yml") && !appFile.getName().endsWith("yaml"))) {
                        log.error("Ignore this template file: {}.", appFile.getName());
                        continue;
                    }
                    try (var fileInputStream = new FileInputStream(appFile)) {
                        var app = yaml.loadAs(fileInputStream, Job.class);
                        if (app != null) {
                            appDefines.put(app.getApp().toLowerCase(), app);
                        }
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                        log.error("Ignore this template file: {}.", appFile.getName());
                    }
                }
            }
            return true;
        }

        @Override
        public String loadAppDefine(String app) {
            var classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
            var defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
            var defineAppFile = new File(defineAppPath);
            if (defineAppFile.exists() && defineAppFile.isFile()) {
                log.info("load {} define app yml in file: {}", app, defineAppPath);
                try {
                    return FileUtils.readFileToString(defineAppFile, StandardCharsets.UTF_8);
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
            return null;
        }

        @Override
        public void save(String app, String ymlContent) {
            var classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
            var defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
            var defineAppFile = new File(defineAppPath);
            try {
                FileUtils.writeStringToFile(defineAppFile, ymlContent, StandardCharsets.UTF_8, false);
            } catch (Exception e) {
                log.error(e.getMessage());
                throw new RuntimeException("flush file " + defineAppPath + " error: " + e.getMessage());
            }
        }

        @Override
        public void delete(String app) {
            var classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
            var defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
            var defineAppFile = new File(defineAppPath);

            if (!defineAppFile.exists() && appDefines.containsKey(app.toLowerCase())){
                throw new CommonException("the app define file is not in current file server provider");
            }

            if (defineAppFile.exists() && defineAppFile.isFile()) {
                defineAppFile.delete();
            }
            appDefines.remove(app.toLowerCase());
        }
    }

    private class ObjectStoreAppDefineStoreImpl implements AppDefineStore {

        @Override
        public boolean loadAppDefines() {
            var objectStoreService = getObjectStoreService();
            Yaml yaml = new Yaml();
            objectStoreService.list("define")
                    .forEach(it -> {
                        if (it.getInputStream() != null) {
                            var app = yaml.loadAs(it.getInputStream(), Job.class);
                            if (app != null) {
                                appDefines.put(app.getApp().toLowerCase(), app);
                            }
                        }
                    });
            return false;
        }

        @Override
        public String loadAppDefine(String app) {
            var objectStoreService = getObjectStoreService();
            var file = objectStoreService.download(getDefineAppPath(app));
            if (isNull(file)) {
                return null;
            }
            try {
                return IOUtils.toString(file.getInputStream(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.error("load app define from object store service error", e);
                return null;
            }
        }

        @Override
        public void save(String app, String ymlContent) {
            var objectStoreService = getObjectStoreService();
            objectStoreService.upload(getDefineAppPath(app), IOUtils.toInputStream(ymlContent, StandardCharsets.UTF_8));
        }

        @Override
        public void delete(String app) {
            var objectStoreService = getObjectStoreService();
            String defineAppPath = getDefineAppPath(app);
            boolean exist = objectStoreService.isExist(defineAppPath);
            if (!exist && appDefines.containsKey(app.toLowerCase())){
                throw new CommonException("the app define file is not in current file server provider");
            }
            if (exist){
                objectStoreService.remove(defineAppPath);
            }
            appDefines.remove(app.toLowerCase());
        }

        private ObjectStoreService getObjectStoreService() {
            return SpringContextHolder.getBean(ObsObjectStoreServiceImpl.class);
        }

        private String getDefineAppPath(String app) {
            return "define/app-" + app + ".yml";
        }

    }

    private class DatabaseAppDefineStoreImpl implements AppDefineStore {

        @Override
        public boolean loadAppDefines() {
            Yaml yaml = new Yaml();
            List<Define> defines = defineDao.findAll();
            for (Define define : defines) {
                var app = yaml.loadAs(define.getContent(), Job.class);
                if (app != null){
                    appDefines.put(define.getApp().toLowerCase(), app);
                }
            }
            // merge define yml files inside jars
            return false;
        }

        @Override
        public String loadAppDefine(String app) {
            Optional<Define> defineOptional = defineDao.findById(app);
            return defineOptional.map(Define::getContent).orElse(null);
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
            Optional<Define> defineOptional = defineDao.findById(app);
            if (defineOptional.isEmpty() && appDefines.containsKey(app.toLowerCase())){
                throw new CommonException("the app define file is not in current file server provider");
            }
            if (defineOptional.isPresent()){
                defineDao.deleteById(app);
            }
            appDefines.remove(app.toLowerCase());
        }
    }
}
