package org.dromara.hertzbeat.manager.service.impl;

import io.netty.channel.Channel;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.dto.CollectorInfo;
import org.dromara.hertzbeat.common.entity.manager.Collector;
import org.dromara.hertzbeat.manager.dao.CollectorDao;
import org.dromara.hertzbeat.manager.service.CollectorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * collector service 
 * @author tom
 */
@Service
public class CollectorServiceImpl implements CollectorService {
    
    private final Map<String, Channel> collectorChannelMap = new ConcurrentHashMap<>(16);
    
    @Autowired
    private CollectorDao collectorDao;
    
    @Override
    public void collectorGoOnline(String identity, CollectorInfo collectorInfo) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        Collector collector = null;
        if (collectorOptional.isPresent()) {
            collector = collectorOptional.get();
            collector.setStatus(CommonConstants.COLLECTOR_STATUS_ONLINE);
            collector.setIp(collectorInfo.getIp());
        } else {
            collector = Collector.builder().name(identity).ip(collectorInfo.getIp())
                                .status(CommonConstants.COLLECTOR_STATUS_ONLINE).build();
        }
        collectorDao.save(collector);
        reBalanceMonitoringJobs();
    }
    
    @Override
    public void collectorGoOffline(String identity) {
        Optional<Collector> collectorOptional = collectorDao.findCollectorByName(identity);
        if (collectorOptional.isPresent()) {
            Collector collector = collectorOptional.get();
            collector.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE);
            collectorDao.save(collector);
            reBalanceMonitoringJobs();
        }
    }
    
    @Override
    public void collectorHeartbeat(String identity) {
        // todo 这里使用心跳来维护判断采集器状态
        // todo 比如配置5分钟内没有新的心跳，就更新采集器的状态为offline 然后 re balance 监控任务分发
        
        
        // 1. 程序启动时将读取数据库所有采集器记录，将其加入心跳判断map
        // 2. 新启动一个线程，定时判断采集器的心跳记录，对符合条件的(比如6分钟离线)采集器进行online offline状态处理，然后触发 re balance
        // 3. 外部采集器在这里上报心跳，来更新心跳记录
    }
    
    @Override
    public void reBalanceMonitoringJobs() {
        // todo 根据采集器集群状态重新分发随机路由的采集任务，对于指定采集器的任务不用重新分发
    }
    
    @Override
    public void holdCollectorChannel(String identity, Channel channel) {
        this.collectorChannelMap.put(identity, channel);
    }
}
