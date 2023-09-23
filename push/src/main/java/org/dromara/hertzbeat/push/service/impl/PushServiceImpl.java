package org.dromara.hertzbeat.push.service.impl;


import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.push.PushMetrics;
import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.push.dao.PushMetricsDao;
import org.dromara.hertzbeat.push.dao.PushMonitorDao;
import org.dromara.hertzbeat.push.service.PushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * push service impl
 *
 * @author vinci
 */
@Slf4j
@Service
public class PushServiceImpl implements PushService {

    @Autowired
    private PushMonitorDao monitorDao;

    @Autowired
    private PushMetricsDao metricsDao;

    private Map<Long, Long> monitorIdCache;

    private final long cacheTimeout = 5000; // ms

    private Map<Long, PushMetricsDto.Metrics> lastestPushMetrics;

    PushServiceImpl(){
        monitorIdCache = new HashMap<>();
        lastestPushMetrics = new HashMap<>();
    }

    @Override
    public void pushMetricsData(PushMetricsDto pushMetricsDto) throws RuntimeException {
        List<PushMetrics> pushMetricsList = new ArrayList<>();
        long curTime = System.currentTimeMillis();
        for (PushMetricsDto.Metrics metrics : pushMetricsDto.getMetricsList()) {
            long monitorId = metrics.getMonitorId();

            if (!monitorIdCache.containsKey(monitorId) && (monitorIdCache.containsKey(monitorId) && curTime > monitorIdCache.get(monitorId) + cacheTimeout)) {
                Optional<Monitor> queryOption = monitorDao.findById(monitorId);
                if (queryOption.isEmpty()) {
                    monitorIdCache.remove(monitorId);
                    continue;
                }
                monitorIdCache.put(monitorId, curTime);
            }

            PushMetrics pushMetrics = PushMetrics.builder()
                    .monitorId(metrics.getMonitorId())
//                    .time(metrics.getTime() == null ? System.currentTimeMillis() : metrics.getTime())
                    .time(System.currentTimeMillis())
                    .metrics(JsonUtil.toJson(metrics.getMetrics())).build();
            lastestPushMetrics.put(monitorId, metrics);
            pushMetricsList.add(pushMetrics);
        }

        metricsDao.saveAll(pushMetricsList);

    }

    @Override
    public PushMetricsDto getPushMetricData(final Long monitorId) {//, final Long time) {
        PushMetricsDto.Metrics metrics;
        PushMetricsDto pushMetricsDto = new PushMetricsDto();
        if (lastestPushMetrics.containsKey(monitorId)) {
            metrics = lastestPushMetrics.get(monitorId);
        }
        else {
            try {
                PushMetrics pushMetrics = metricsDao.findFirstByMonitorIdOrderByTimeDesc(monitorId);
                Map<String, String> jsonMap = JsonUtil.fromJson(pushMetrics.getMetrics(), new TypeReference<Map<String, String>>() {
                });
                metrics = PushMetricsDto.Metrics.builder().metrics(jsonMap).build();
                lastestPushMetrics.put(monitorId, metrics);
            }
            catch (Exception e) {
                log.error("no metrics found, {}.", e.getMessage(), e);
                return pushMetricsDto;
            }
        }
        pushMetricsDto.getMetricsList().add(metrics);
        // 目前先不删除
        // metricsDao.deleteAllById(toBeDelMetricsId);
        return pushMetricsDto;
    }

}
