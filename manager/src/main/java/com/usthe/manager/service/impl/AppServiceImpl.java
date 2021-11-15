package com.usthe.manager.service.impl;

import com.usthe.common.entity.job.Job;
import com.usthe.manager.dao.ParamDefineDao;
import com.usthe.manager.pojo.entity.ParamDefine;
import com.usthe.manager.service.AppService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

import javax.persistence.criteria.Join;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URL;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 监控类型管理实现
 *
 *
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class AppServiceImpl implements AppService, CommandLineRunner {

    private final Map<String, Job> appDefines = new ConcurrentHashMap<>();

    @Autowired
    private ParamDefineDao paramDefineDao;

    @Override
    public List<ParamDefine> getAppParamDefines(String app) {
        List<ParamDefine> paramDefines = paramDefineDao.findParamDefinesByApp(app);
        if (paramDefines == null) {
            paramDefines = Collections.emptyList();
        }
        return paramDefines;
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
                    appDefines.put(app.getApp(), app);
                } catch (IOException e) {
                    log.error(e.getMessage(), e);
                    throw new IOException(e);
                }
            }
        }
    }
}
