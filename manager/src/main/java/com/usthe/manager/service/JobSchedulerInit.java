package com.usthe.manager.service;

import com.usthe.collector.dispatch.entrance.internal.CollectJobService;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.manager.Monitor;
import com.usthe.common.entity.manager.Param;
import com.usthe.common.util.GsonUtil;
import com.usthe.manager.dao.MonitorDao;
import com.usthe.manager.dao.ParamDao;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 采集任务调度初始化
 * @author tom
 * @date 2022/2/1 16:24
 */
@Service
@Order(value = 2)
@Slf4j
public class JobSchedulerInit implements CommandLineRunner {

    @Autowired
    private AppService appService;

    @Autowired
    private CollectJobService collectJobService;

    @Autowired
    private MonitorDao monitorDao;

    @Autowired
    private ParamDao paramDao;

    @Override
    public void run(String... args) throws Exception {
        // 读取数据库已经添加应用 构造采集任务
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(Arrays.asList((byte)0, (byte)4));
        for (Monitor monitor : monitors) {
            try {
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                // todo 这里暂时是深拷贝处理
                appDefine = GsonUtil.fromJson(GsonUtil.toJson(appDefine), Job.class);
                appDefine.setId(monitor.getJobId());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream().map(param ->
                        new Configmap(param.getField(), param.getValue(), param.getType())).collect(Collectors.toList());
                appDefine.setConfigmap(configmaps);
                // 下发采集任务
                collectJobService.addAsyncCollectJob(appDefine);
            } catch (Exception e) {
                log.error("init monitor job: {} error,continue next monitor", monitor, e);
            }
        }
    }
}
