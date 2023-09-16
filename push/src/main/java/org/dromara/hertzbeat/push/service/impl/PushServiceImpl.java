package org.dromara.hertzbeat.push.service.impl;


import com.fasterxml.jackson.core.type.TypeReference;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.common.entity.push.PushMetrics;
import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.push.dao.PushMetricsDao;
import org.dromara.hertzbeat.push.dao.PushMonitorDao;
import org.dromara.hertzbeat.push.service.PushService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * push service impl
 *
 * @author vinci
 */
@Service
public class PushServiceImpl implements PushService {

    @Autowired
    private PushMonitorDao monitorDao;

    @Autowired
    private PushMetricsDao metricsDao;

    @Override
    public void pushMetricsData(PushMetricsDto pushMetricsDto) throws RuntimeException {
        List<PushMetrics> pushMetricsList = new ArrayList<>();
        // TODO: 改成只取不同的monitorId
        for (PushMetricsDto.Metrics metrics : pushMetricsDto.getMetricsList()) {
            long monitorId = metrics.getMonitorId();
            Optional<Monitor> queryOption = monitorDao.findById(monitorId);
            if (queryOption.isEmpty()) {
                throw new IllegalArgumentException("The Monitor " + monitorId + " not exists");
            }
            PushMetrics.PushMetricsBuilder pushMetricsBuilder = PushMetrics.builder()
                    .monitorId(metrics.getMonitorId())
                    .time(metrics.getTime() == null ? System.currentTimeMillis() : metrics.getTime())
                    .metrics(JsonUtil.toJson(metrics.getMetrics()));
            pushMetricsList.add(pushMetricsBuilder.build());
        }

        metricsDao.saveAll(pushMetricsList);
    }

    @Override
    public PushMetricsDto getPushMetricData(final Long monitorId, final Long time) {
        List<PushMetrics> pushMetricsList = metricsDao.findByMonitorIdEqualsAndTimeGreaterThanEqual(monitorId, time);
        PushMetricsDto pushMetricsDto = new PushMetricsDto();
        List<Long> toBeDelMetricsId = new ArrayList<>();
        for (PushMetrics p : pushMetricsList) {
            toBeDelMetricsId.add(p.getId());
            PushMetricsDto.Metrics.MetricsBuilder builder = PushMetricsDto.Metrics.builder()
                    .monitorId(p.getMonitorId())
                    .time(p.getTime())
                    .metrics(JsonUtil.fromJson(p.getMetrics(), new TypeReference<List<String>>() {
                    }));
            pushMetricsDto.getMetricsList().add(builder.build());
        }
        metricsDao.deleteAllById(toBeDelMetricsId);
        return pushMetricsDto;
    }

}
