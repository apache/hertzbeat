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

    private final Map<Long, Long> monitorIdCache; // key: monitorId, value: time stamp of last query

    private static final long cacheTimeout = 5000; // ms

    private final Map<Long, PushMetricsDto.Metrics> lastPushMetrics;

    private static final long deleteMetricsPeriod = 1000 * 60 * 60 * 12;

    private static final long deleteBeforeTime = deleteMetricsPeriod / 2;

    PushServiceImpl(){
        monitorIdCache = new HashMap<>();
        lastPushMetrics = new HashMap<>();

        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                try{
                    deletePeriodically();
                }catch (Exception e) {
                    log.error("periodical deletion failed. {}", e.getMessage());
                }
            }
        }, 1000, deleteMetricsPeriod);
    }

    public void deletePeriodically(){
        metricsDao.deleteAllByTimeBefore(System.currentTimeMillis() - deleteBeforeTime);
    }

    @Override
    public void pushMetricsData(PushMetricsDto pushMetricsDto) throws RuntimeException {
        List<PushMetrics> pushMetricsList = new ArrayList<>();
        long curTime = System.currentTimeMillis();
        for (PushMetricsDto.Metrics metrics : pushMetricsDto.getMetricsList()) {
            long monitorId = metrics.getMonitorId();
            metrics.setTime(curTime);

            if (!monitorIdCache.containsKey(monitorId) || (monitorIdCache.containsKey(monitorId) && curTime > monitorIdCache.get(monitorId) + cacheTimeout)) {
                Optional<Monitor> queryOption = monitorDao.findById(monitorId);
                if (queryOption.isEmpty()) {
                    monitorIdCache.remove(monitorId);
                    continue;
                }
                monitorIdCache.put(monitorId, curTime);
            }

            PushMetrics pushMetrics = PushMetrics.builder()
                    .monitorId(metrics.getMonitorId())
                    .time(curTime)
                    .metrics(JsonUtil.toJson(metrics.getMetrics())).build();
            lastPushMetrics.put(monitorId, metrics);
            pushMetricsList.add(pushMetrics);
        }

        metricsDao.saveAll(pushMetricsList);

    }

    @Override
    public PushMetricsDto getPushMetricData(final Long monitorId, final Long time) {
        PushMetricsDto.Metrics metrics;
        PushMetricsDto pushMetricsDto = new PushMetricsDto();
        if (lastPushMetrics.containsKey(monitorId)) {
            metrics = lastPushMetrics.get(monitorId);
        }
        else {
            try {
                PushMetrics pushMetrics = metricsDao.findFirstByMonitorIdOrderByTimeDesc(monitorId);
                if (pushMetrics == null || pushMetrics.getMetrics() == null) {
                    return pushMetricsDto;
                }
                List<Map<String, String>> jsonMap = JsonUtil.fromJson(pushMetrics.getMetrics(), new TypeReference<List<Map<String, String>>>() {
                });
                metrics = PushMetricsDto.Metrics.builder().monitorId(monitorId).metrics(jsonMap).time(pushMetrics.getTime()).build();
                lastPushMetrics.put(monitorId, metrics);
            }
            catch (Exception e) {
                log.error("no metrics found, monitor id: {}, {}, {}", monitorId, e.getMessage(), e);
                return pushMetricsDto;
            }
        }
        if (time > metrics.getTime()) {
            // return void because time param is invalid
            return pushMetricsDto;
        }
        pushMetricsDto.getMetricsList().add(metrics);
        return pushMetricsDto;
    }

}
