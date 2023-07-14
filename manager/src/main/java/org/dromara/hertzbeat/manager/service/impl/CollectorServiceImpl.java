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
    public void reBalanceMonitoringJobs() {
        // todo 根据采集器集群状态重新分发随机路由的采集任务，对于指定采集器的任务不用重新分发
    }
    
    @Override
    public void holdCollectorChannel(String identity, Channel channel) {
        this.collectorChannelMap.put(identity, channel);
    }
}
