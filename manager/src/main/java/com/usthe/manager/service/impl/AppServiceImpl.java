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

import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.manager.dao.MonitorDao;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.manager.service.AppService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
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
 * @author tomsun28
 * @date 2021/11/14 17:17
 */
@Service
@Order(value = 1)
@Slf4j
public class AppServiceImpl implements AppService, CommandLineRunner {

    @Autowired
    private MonitorDao monitorDao;

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {
        if (app == null) {
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
    public Job getAppDefine(String app) throws IllegalArgumentException {
        if (app == null) {
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
            appDefines.forEach((k,v)->{
                metricNames.addAll(v.getMetrics().stream().map(Metrics::getName).collect(Collectors.toList()));
            });
        }
        return metricNames;
    }


    @Override
    public Map<String, String> getI18nResources(String lang) {
        Map<String, String> i18nMap = new HashMap<>(128);
        for (Job job : appDefines.values()) {
            // todo needs to support the indicator name
            // 后面需要支持指标名称
            Map<String, String> name = job.getName();
            if (name != null && !name.isEmpty()) {
                String i18nName = name.get(lang);
                if (i18nName == null) {
                    i18nName = name.values().stream().findFirst().get();
                }
                i18nMap.put("monitor.app." + job.getApp(), i18nName);
            }
            for (ParamDefine paramDefine : job.getParams()) {
                Map<String, String> paramDefineName = paramDefine.getName();
                if (paramDefineName != null && !paramDefineName.isEmpty()) {
                    String i18nName = paramDefineName.get(lang);
                    if (i18nName == null) {
                        i18nName = paramDefineName.values().stream().findFirst().get();
                    }
                    i18nMap.put("monitor.app." + job.getApp() + ".param." + paramDefine.getField(), i18nName);
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
            if (nameMap != null) {
                String i18nName = nameMap.get(lang);
                if (i18nName == null) {
                    i18nName = nameMap.values().stream().findFirst().get();
                }
                hierarchyApp.setLabel(i18nName);
            }
            List<Hierarchy> hierarchyMetricList = new LinkedList<>();
            if (job.getMetrics() != null) {
                for (Metrics metrics : job.getMetrics()) {
                    Hierarchy hierarchyMetric = new Hierarchy();
                    hierarchyMetric.setValue(metrics.getName());
                    hierarchyMetric.setLabel(metrics.getName());
                    List<Hierarchy> hierarchyFieldList = new LinkedList<>();
                    if (metrics.getFields() != null) {
                        for (Metrics.Field field : metrics.getFields()) {
                            Hierarchy hierarchyField = new Hierarchy();
                            hierarchyField.setValue(field.getField());
                            hierarchyField.setLabel(field.getField());
                            hierarchyField.setIsLeaf(true);
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
    public String getMonitorDefineFileContent(String app) {
        String classpath = this.getClass().getClassLoader().getResource("").getPath();
        String defineAppPath = classpath + File.separator + "define" + File.separator + "app-" + app + ".yml";
        File defineAppFile = new File(defineAppPath);
        if (!defineAppFile.exists() || !defineAppFile.isFile()) {
            classpath = this.getClass().getResource(File.separator).getPath();
            defineAppPath = classpath + File.separator + "define" + File.separator + "app-" + app + ".yml";
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
        log.info("load {} define app yml in file: {}", app, defineAppPath);
        try {
            return FileUtils.readFileToString(defineAppFile, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
        throw new IllegalArgumentException("can not find " + app + " define yml");
    }

    @Override
    public void applyMonitorDefineYml(String ymlContent) {
        Yaml yaml = new Yaml();
        Job app;
        try {
            app = yaml.loadAs(ymlContent, Job.class);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new IllegalArgumentException("parse yml define error: " + e.getMessage());
        }
        // app params verify
        verifyDefineAppContent(app);
        String classpath = this.getClass().getClassLoader().getResource("").getPath();
        String defineAppPath = classpath + File.separator + "define" + File.separator + "app-" + app.getApp() + ".yml";
        File defineAppFile = new File(defineAppPath);
        try {
            FileUtils.writeStringToFile(defineAppFile, ymlContent, StandardCharsets.UTF_8, false);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException("flush file " + defineAppPath + " error: " + e.getMessage());
        }
        appDefines.put(app.getApp().toLowerCase(), app);
    }

    private void verifyDefineAppContent(Job app) {
        Assert.notNull(app, "define yml can not null");
        Assert.notNull(app.getApp(), "define yml require attributes app");
        Assert.notNull(app.getCategory(), "define yml require attributes category");
        Assert.notEmpty(app.getName(), "define yml require attributes name");
        Assert.notEmpty(app.getParams(), "define yml require attributes params");
        Assert.notEmpty(app.getMetrics(), "define yml require attributes metrics");
    }

    @Override
    public void deleteMonitorDefine(String app) {
        // if app has monitors now, delete failed
        List<Monitor> monitors = monitorDao.findMonitorsByAppEquals(app);
        if (monitors != null && !monitors.isEmpty()) {
            throw new IllegalArgumentException("Can not delete define which has monitoring instances.");
        }
        String classpath = this.getClass().getClassLoader().getResource("").getPath();
        String defineAppPath = classpath + File.separator + "define" + File.separator + "app-" + app + ".yml";
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
            defineAppPath = classpath + File.separator + "define";
            directory = new File(defineAppPath);
            if (!directory.exists() || directory.listFiles() == null) {
                rootUrl = this.getClass().getResource(File.separator);
                if (rootUrl == null) {
                    loadFromFile = false;
                } else {
                    classpath = rootUrl.getPath();
                    defineAppPath = classpath + File.separator + "define";
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
                    try (FileInputStream fileInputStream = new FileInputStream(appFile)) {
                        Job app = yaml.loadAs(fileInputStream, Job.class);
                        appDefines.put(app.getApp().toLowerCase(), app);
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                        throw e;
                    }
                }
            }
        }
    }
}
