package com.usthe.manager.service.impl;

import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.manager.dao.ParamDefineDao;
import com.usthe.manager.pojo.dto.Hierarchy;
import com.usthe.manager.pojo.dto.ParamDefineDto;
import com.usthe.common.entity.manager.ParamDefine;
import com.usthe.manager.service.AppService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 监控类型管理实现
 * TODO 暂时将监控配置和参数配置存放内存 之后存入数据库
 * @author tomsun28
 * @date 2021/11/14 17:17
 */
@Service
@Order(value = 1)
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AppServiceImpl implements AppService, CommandLineRunner {

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();
    private final Map<String, List<ParamDefine>> paramDefines = new ConcurrentHashMap<>();

    @Autowired
    private ParamDefineDao paramDefineDao;

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {
        List<ParamDefine> params = paramDefines.get(app);
        if (params == null) {
            params = Collections.emptyList();
        }
        return params;
    }

    @Override
    public Job getAppDefine(String app) throws IllegalArgumentException {
        Job appDefine = appDefines.get(app);
        if (appDefine == null) {
            throw new IllegalArgumentException("The app " + app + " not support.");
        }
        return appDefine.clone();
    }

    @Override
    public Map<String, String> getI18nResources(String lang) {
        Map<String, String> i18nMap = new HashMap<>(32);
        for (Job job : appDefines.values()) {
            // todo 暂时只国际化监控类型名称  后面需要支持指标名称
            Map<String, String> name = job.getName();
            if (name != null && !name.isEmpty()) {
                String i18nName = name.get(lang);
                if (i18nName == null) {
                    i18nName = name.values().stream().findFirst().get();
                }
                i18nMap.put("monitor.app." + job.getApp(), i18nName);
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
    public void run(String... args) throws Exception {
        boolean loadFromFile = true;
        final List<InputStream> inputStreams = new LinkedList<>();
        // 读取app定义配置加载到内存中 define/app/*.yml
        Yaml yaml = new Yaml();
        String classpath = this.getClass().getClassLoader().getResource("").getPath();
        String defineAppPath = classpath + File.separator + "define" + File.separator + "app";
        File directory = new File(defineAppPath);
        if (!directory.exists() || directory.listFiles() == null) {
            classpath = this.getClass().getResource(File.separator).getPath();
            defineAppPath = classpath + File.separator + "define" + File.separator + "app";
            directory = new File(defineAppPath);
            if (!directory.exists() || directory.listFiles() == null) {
                // load define app yml in jar
                log.info("load define app yml in internal jar");
                loadFromFile = false;
                try {
                    ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
                    Resource[] resources = resolver.getResources("classpath:define/app/*.yml");
                    for (Resource resource : resources) {
                        inputStreams.add(resource.getInputStream());
                    }
                } catch (Exception e) {
                    log.error("define app yml not exist");
                    throw e;
                }
            }
        }
        if (loadFromFile) {
            log.info("load define path {}", defineAppPath);
            for (File appFile : Objects.requireNonNull(directory.listFiles())) {
                if (appFile.exists()) {
                    try (FileInputStream fileInputStream = new FileInputStream(appFile)) {
                        Job app = yaml.loadAs(fileInputStream, Job.class);
                        appDefines.put(app.getApp().toLowerCase(), app);
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                        throw new IOException(e);
                    }
                }
            }
        } else {
            if (inputStreams.isEmpty()) {
                throw new IllegalArgumentException("define app directory not exist");
            } else {
                inputStreams.forEach(stream -> {
                    try {
                        Job app = yaml.loadAs(stream, Job.class);
                        appDefines.put(app.getApp().toLowerCase(), app);
                        stream.close();
                    } catch (Exception e) {
                        log.error(e.getMessage(), e);
                    }
                });
            }
        }

        // 读取监控参数定义配置加载到数据库中 define/param/*.yml
        if (loadFromFile) {
            String defineParamPath = classpath + File.separator + "define" + File.separator + "param";
            directory = new File(defineParamPath);
            if (!directory.exists() || directory.listFiles() == null) {
                throw new  IllegalArgumentException("define param directory not exist: " + defineParamPath);
            }
            for (File appFile : Objects.requireNonNull(directory.listFiles())) {
                if (appFile.exists()) {
                    try (FileInputStream fileInputStream = new FileInputStream(appFile)) {
                        ParamDefineDto paramDefine = yaml.loadAs(fileInputStream, ParamDefineDto.class);
                        paramDefines.put(paramDefine.getApp().toLowerCase(), paramDefine.getParam());
                    } catch (IOException e) {
                        log.error(e.getMessage(), e);
                        throw new IOException(e);
                    }
                }
            }
        } else {
            try {
                ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
                Resource[] resources = resolver.getResources("classpath:define/param/*.yml");
                for (Resource resource : resources) {
                    InputStream stream = resource.getInputStream();
                    ParamDefineDto paramDefine = yaml.loadAs(stream, ParamDefineDto.class);
                    paramDefines.put(paramDefine.getApp().toLowerCase(), paramDefine.getParam());
                    stream.close();
                }
            } catch (Exception e) {
                log.error("define param yml not exist");
                throw e;
            }
        }
    }
}
