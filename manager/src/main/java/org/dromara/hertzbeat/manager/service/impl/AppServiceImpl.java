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

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.dromara.hertzbeat.common.support.SpringContextHolder;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.pojo.dto.Hierarchy;
import org.dromara.hertzbeat.manager.service.AppService;
import org.dromara.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Monitoring Type Management Implementation
 * 监控类型管理实现
 * temporarily stores the monitoring configuration and parameter configuration in memory and then stores it in the
 * 暂时将监控配置和参数配置存放内存 之后存入数据库
 *
 *
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class AppServiceImpl implements AppService, CommandLineRunner {

    private static final String JAVA_PATH_SEPARATOR = "/";

    private static final String PUSH_PROTOCOL_METRICS_NAME = "metrics";

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {
        if (!StringUtils.hasText(app)) {
            return Collections.emptyList();
        }
        Job appDefine = appDefines.get(app.toLowerCase());
        if (appDefine != null && appDefine.getParams() != null) {
            return appDefine.getParams();
        } else {
            return Collections.emptyList();
        }
    }

    @Override
    public Job getPushDefine(Long monitorId) throws IllegalArgumentException {
//        if (!StringUtils.hasText(app)) {
//            throw new IllegalArgumentException("The app can not null.");
//        }
//        Job appDefine = appDefines.get(app.toLowerCase());
//        if (appDefine == null) {
//            throw new IllegalArgumentException("The app " + app + " not support.");
//        }
//        return appDefine.clone();
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
                        .map(param -> new Configmap(param.getField(), param.getValue(),
                                param.getType())).collect(Collectors.toList());
                Map<String, Configmap> configmap = configmaps.stream().collect(Collectors.toMap(Configmap::getKey, item -> item, (key1, key2) -> key1));
                CollectUtil.replaceFieldsForPushStyleMonitor(metric, configmap);
                metricsTmp.add(metric);
            }
        }
        appDefine.setMetrics(metricsTmp);
        return appDefine;
    }

    @Override
    public Job getAppDefine(String app) throws IllegalArgumentException {
        if (!StringUtils.hasText(app)) {
            throw new IllegalArgumentException("The app can not null.");
        }
        Job appDefine = appDefines.get(app.toLowerCase());
        if (appDefine == null) {
            throw new IllegalArgumentException("The app " + app + " not support.");
        }
        return appDefine.clone();
    }

    @Override
    public List<String> getAppDefineMetricNames(String app) {
        List<String> metricNames = new ArrayList<>(16);
        if (StringUtils.hasLength(app)) {
            Job appDefine = appDefines.get(app.toLowerCase());
            if (appDefine == null) {
                throw new IllegalArgumentException("The app " + app + " not support.");
            }
            metricNames.addAll(appDefine.getMetrics().stream().map(Metrics::getName).collect(Collectors.toList()));
        } else {
            appDefines.forEach((k, v) -> {
                metricNames.addAll(v.getMetrics().stream().map(Metrics::getName).collect(Collectors.toList()));
            });
        }
        return metricNames;
    }


    @Override
    public Map<String, String> getI18nResources(String lang) {
        Map<String, String> i18nMap = new HashMap<>(128);
        for (Job job : appDefines.values()) {
            Map<String, String> name = job.getName();
            String i18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, name);
            if (i18nName != null) {
                i18nMap.put("monitor.app." + job.getApp(), i18nName);
            }
            Map<String, String> help = job.getHelp();
            String i18nHelp = CommonUtil.getLangMappingValueFromI18nMap(lang, help);
            if (i18nHelp != null) {
                i18nMap.put("monitor.app." + job.getApp() + ".help", i18nHelp);
            }

            Map<String, String> helpLink = job.getHelpLink();
            String i18nHelpLink = CommonUtil.getLangMappingValueFromI18nMap(lang, helpLink);
            if (i18nHelpLink != null) {
                i18nMap.put("monitor.app." + job.getApp() + ".helpLink", i18nHelpLink);
            }

            for (ParamDefine paramDefine : job.getParams()) {
                Map<String, String> paramDefineName = paramDefine.getName();
                String i18nParamName = CommonUtil.getLangMappingValueFromI18nMap(lang, paramDefineName);
                if (i18nParamName != null) {
                    i18nMap.put("monitor.app." + job.getApp() + ".param." + paramDefine.getField(), i18nParamName);
                }
            }
            for (Metrics metrics : job.getMetrics()) {
                Map<String, String> metricsI18nName = metrics.getI18n();
                String i18nMetricsName = CommonUtil.getLangMappingValueFromI18nMap(lang, metricsI18nName);
                if (i18nMetricsName != null) {
                    i18nMap.put("monitor.app." + job.getApp() + ".metrics." + metrics.getName(), i18nMetricsName);
                }
                if (metrics.getFields() == null) {
                    continue;
                }
                for (Metrics.Field field : metrics.getFields()) {
                    Map<String, String> fieldI18nName = field.getI18n();
                    String i18nMetricName = CommonUtil.getLangMappingValueFromI18nMap(lang, fieldI18nName);
                    if (i18nMetricName != null) {
                        i18nMap.put("monitor.app." + job.getApp() + ".metrics." + metrics.getName() + ".metric." + field.getField(), i18nMetricName);
                    }
                }
            }
        }
        return i18nMap;
    }

    @Override
    public List<Hierarchy> getAllAppHierarchy(String lang) {
        List<Hierarchy> hierarchies = new LinkedList<>();
        for (Job job : appDefines.values()) {
            Hierarchy hierarchyApp = new Hierarchy();
            hierarchyApp.setCategory(job.getCategory());
            hierarchyApp.setValue(job.getApp());
            Map<String, String> nameMap = job.getName();
            if (nameMap != null && !nameMap.isEmpty()) {
                String i18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, nameMap);
                if (i18nName != null) {
                    hierarchyApp.setLabel(i18nName);
                }
            }
            List<Hierarchy> hierarchyMetricList = new LinkedList<>();
            if (job.getMetrics() != null) {
                for (Metrics metrics : job.getMetrics()) {
                    Hierarchy hierarchyMetric = new Hierarchy();
                    hierarchyMetric.setValue(metrics.getName());
                    String metricsI18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, metrics.getI18n());
                    hierarchyMetric.setLabel(metricsI18nName != null ? metricsI18nName : metrics.getName());
                    List<Hierarchy> hierarchyFieldList = new LinkedList<>();
                    if (metrics.getFields() != null) {
                        for (Metrics.Field field : metrics.getFields()) {
                            Hierarchy hierarchyField = new Hierarchy();
                            hierarchyField.setValue(field.getField());
                            String metricI18nName = CommonUtil.getLangMappingValueFromI18nMap(lang, field.getI18n());
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
        return hierarchies;
    }

    @Override
    public Map<String, Job> getAllAppDefines() {
        return appDefines;
    }


    @Override
    public String getMonitorDefineFileContent(String app) {
        String classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
        String defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
        File defineAppFile = new File(defineAppPath);
        if (!defineAppFile.exists() || !defineAppFile.isFile()) {
            URL resourceUrl = this.getClass().getResource(JAVA_PATH_SEPARATOR);
            if (resourceUrl != null) {
                classpath = resourceUrl.getPath();
                defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
                defineAppFile = new File(defineAppPath);
                if (!defineAppFile.exists() || !defineAppFile.isFile()) {
                    try {
                        // load define app yml in jar
                        log.info("load define app yml in internal jar");
                        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
                        Resource resource = resolver.getResource("classpath:define/" + app + ".yml");
                        InputStream inputStream = resource.getInputStream();
                        String content = StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
                        inputStream.close();
                        return content;
                    } catch (Exception e) {
                        log.error(e.getMessage());
                    }
                }
            }
        }
        log.info("load {} define app yml in file: {}", app, defineAppPath);
        try {
            return FileUtils.readFileToString(defineAppFile, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
        throw new IllegalArgumentException("can not find " + app + " define yml");
    }

    @Override
    public void applyMonitorDefineYml(String ymlContent, boolean isModify) {
        Yaml yaml = new Yaml();
        Job app;
        try {
            app = yaml.loadAs(ymlContent, Job.class);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new IllegalArgumentException("parse yml error: " + e.getMessage());
        }
        // app params verify
        verifyDefineAppContent(app, isModify);
        String classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
        String defineAppPath = classpath + "define" + File.separator + "app-" + app.getApp() + ".yml";
        File defineAppFile = new File(defineAppPath);
        try {
            FileUtils.writeStringToFile(defineAppFile, ymlContent, StandardCharsets.UTF_8, false);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException("flush file " + defineAppPath + " error: " + e.getMessage());
        }
        appDefines.put(app.getApp().toLowerCase(), app);
        // bug  当模板 app-redis.yml被修改，比如 增加指标组，删除指标，当前的job中，持有的缓存 metrics实例，
        // 解决 ：模板修改后，同类型模板的所有监控实例 ，在监控状态中，需要重新下发任务
        SpringContextHolder.getBean(MonitorService.class).updateAppCollectJob(app);
    }

    private void verifyDefineAppContent(Job app, boolean isModify) {
        Assert.notNull(app, "monitoring template can not null");
        Assert.notNull(app.getApp(), "monitoring template require attributes app");
        Assert.notNull(app.getCategory(), "monitoring template require attributes category");
        Assert.notEmpty(app.getName(), "monitoring template require attributes name");
        Assert.notEmpty(app.getParams(), "monitoring template require attributes params");
        boolean hasParamHost = app.getParams().stream().anyMatch(item -> "host".equals(item.getField()));
        Assert.isTrue(hasParamHost, "monitoring template attributes params must have param host");
        Assert.notEmpty(app.getMetrics(), "monitoring template require attributes metrics");
        boolean hasAvailableMetrics = app.getMetrics().stream().anyMatch(item -> item.getPriority() == 0);
        Assert.isTrue(hasAvailableMetrics, "monitoring template metrics list must have one priority 0 metrics");
        if (!isModify) {
            Assert.isNull(appDefines.get(app.getApp().toLowerCase()),
                    "monitoring template name " + app.getApp() + " already exists.");
        }
    }

    @Override
    public void deleteMonitorDefine(String app) {
        // if app has monitors now, delete failed
        List<Monitor> monitors = monitorDao.findMonitorsByAppEquals(app);
        if (monitors != null && !monitors.isEmpty()) {
            throw new IllegalArgumentException("Can not delete define which has monitoring instances.");
        }
        String classpath = Objects.requireNonNull(this.getClass().getClassLoader().getResource("")).getPath();
        String defineAppPath = classpath + "define" + File.separator + "app-" + app + ".yml";
        File defineAppFile = new File(defineAppPath);
        if (defineAppFile.exists() && defineAppFile.isFile()) {
            defineAppFile.delete();
        }
        appDefines.remove(app.toLowerCase());
    }

    @Override
    public void run(String... args) throws Exception {
        boolean loadFromFile = true;
        // 读取监控定义配置加载到内存中 define/*.yml
        Yaml yaml = new Yaml();
        URL rootUrl = this.getClass().getClassLoader().getResource("");
        String defineAppPath = null;
        File directory = null;
        if (rootUrl == null) {
            loadFromFile = false;
        } else {
            String classpath = rootUrl.getPath();
            defineAppPath = classpath + "define";
            directory = new File(defineAppPath);
            if (!directory.exists() || directory.listFiles() == null) {
                rootUrl = this.getClass().getResource(File.separator);
                if (rootUrl == null) {
                    loadFromFile = false;
                } else {
                    classpath = rootUrl.getPath();
                    defineAppPath = classpath + "define";
                    directory = new File(defineAppPath);
                    if (!directory.exists() || directory.listFiles() == null) {
                        loadFromFile = false;
                    }
                }
            }
        }
        if (!loadFromFile) {
            try {
                log.info("load define app yml in internal jar");
                ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
                Resource[] resources = resolver.getResources("classpath:define/*.yml");
                for (Resource resource : resources) {
                    try {
                        InputStream inputStream = resource.getInputStream();
                        Job app = yaml.loadAs(inputStream, Job.class);
                        appDefines.put(app.getApp().toLowerCase(), app);
                        inputStream.close();
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                        log.error("Ignore this template file: {}.", resource.getFilename());
                    }
                }
            } catch (Exception e) {
                log.error("define app yml not exist");
                throw e;
            }
        }
        if (loadFromFile && directory.listFiles() != null) {
            log.info("load define path {}", defineAppPath);
            for (File appFile : Objects.requireNonNull(directory.listFiles())) {
                if (appFile.exists() && appFile.isFile()) {
                    if (appFile.isHidden()
                            || (!appFile.getName().endsWith("yml") && !appFile.getName().endsWith("yaml"))) {
                        log.error("Ignore this template file: {}.", appFile.getName());
                        continue;
                    }
                    try (FileInputStream fileInputStream = new FileInputStream(appFile)) {
                        Job app = yaml.loadAs(fileInputStream, Job.class);
                        if (app != null) {
                            appDefines.put(app.getApp().toLowerCase(), app);
                        }
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                        log.error("Ignore this template file: {}.", appFile.getName());
                    }
                }
            }
        }
    }
}
