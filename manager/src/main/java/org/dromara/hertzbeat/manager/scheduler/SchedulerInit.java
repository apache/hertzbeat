package org.dromara.hertzbeat.manager.scheduler;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.job.Configmap;
import org.dromara.hertzbeat.common.entity.job.Job;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.manager.Param;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.dromara.hertzbeat.manager.dao.MonitorDao;
import org.dromara.hertzbeat.manager.dao.ParamDao;
import org.dromara.hertzbeat.manager.service.AppService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * scheduler init
 * @author tom
 */
@Configuration
@Slf4j
public class SchedulerInit implements CommandLineRunner {
    
    @Autowired
    private CollectorScheduling collectorScheduling;
    
    @Autowired
    private CollectJobScheduling collectJobScheduling;
   
    private static final String MAIN_COLLECTOR_NODE_IP = "127.0.0.1";
    
    @Autowired
    private AppService appService;
    
    @Autowired
    private MonitorDao monitorDao;
    
    @Autowired
    private ParamDao paramDao;
    
    @Autowired
    private CollectorDao collectorDao;
    
    @Autowired
    private CollectorMonitorBindDao collectorMonitorBindDao;
    
    @Override
    public void run(String... args) throws Exception {
        // init pre collector status
        List<Collector> collectors = collectorDao.findAll().stream()
                                             .peek(item -> item.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE))
                                             .collect(Collectors.toList());
        collectorDao.saveAll(collectors);
        // insert default consistent node
        CollectorInfo collectorInfo = CollectorInfo.builder()
                                              .name(CommonConstants.MAIN_COLLECTOR_NODE)
                                              .ip(MAIN_COLLECTOR_NODE_IP)
                                              .build();
        collectorScheduling.collectorGoOnline(CommonConstants.MAIN_COLLECTOR_NODE, collectorInfo);
        // init jobs
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(Arrays.asList((byte)0, (byte)4));
        List<CollectorMonitorBind> monitorBinds = collectorMonitorBindDao.findAll();
        Map<Long, String> monitorIdCollectorMap = monitorBinds.stream().collect(
                Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));
        for (Monitor monitor : monitors) {
            try {
                // 构造采集任务Job实体
                Job appDefine = appService.getAppDefine(monitor.getApp());
                // todo 这里暂时是深拷贝处理
                appDefine = appDefine.clone();
                appDefine.setId(monitor.getJobId());
                appDefine.setMonitorId(monitor.getId());
                appDefine.setInterval(monitor.getIntervals());
                appDefine.setCyclic(true);
                appDefine.setTimestamp(System.currentTimeMillis());
                List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
                List<Configmap> configmaps = params.stream()
                                                     .map(param -> new Configmap(param.getField(), param.getValue(),
                                                             param.getType())).collect(Collectors.toList());
                appDefine.setConfigmap(configmaps);
                String collector = monitorIdCollectorMap.get(monitor.getId());
                long jobId;
                if (StringUtils.hasText(collector)) {
                    jobId = collectJobScheduling.addAsyncCollectJob(appDefine, collector);
                } else {
                    jobId = collectJobScheduling.addAsyncCollectJob(appDefine);   
                }
                monitor.setJobId(jobId);
                monitorDao.save(monitor);
            } catch (Exception e) {
                log.error("init monitor job: {} error,continue next monitor", monitor, e);
            }
        }
    }
}
