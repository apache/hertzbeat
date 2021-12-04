package com.usthe.manager.service.impl;

import com.usthe.common.entity.job.Job;
import com.usthe.manager.dao.ParamDefineDao;
import com.usthe.manager.pojo.dto.ParamDefineDto;
import com.usthe.manager.pojo.entity.ParamDefine;
import com.usthe.manager.service.AppService;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.protocol.types.Field;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URL;
import java.util.Collections;
import java.util.HashMap;
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
        return appDefine;
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
    public void run(String... args) throws Exception {
        // 读取app定义配置加载到内存中 define/app/*.yml
        Yaml yaml = new Yaml();
        String defineAppPath = "define" + File.separator + "app";
        URL url = Thread.currentThread().getContextClassLoader().getResource(defineAppPath);
        assert url != null;
        File directory = new File(url.toURI());
        if (!directory.exists() || directory.listFiles() == null) {
            throw new  IllegalArgumentException("define app directory not exist");
        }
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
        // 读取监控参数定义配置加载到数据库中 define/param/*.yml
        String defineParamPath = "define" + File.separator + "param";
        url = Thread.currentThread().getContextClassLoader().getResource(defineParamPath);
        assert url != null;
        directory = new File(url.toURI());
        if (!directory.exists() || directory.listFiles() == null) {
            throw new  IllegalArgumentException("define param directory not exist");
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
    }
}
