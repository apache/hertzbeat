package org.dromara.hertzbeat.push.service;

import org.dromara.hertzbeat.common.entity.push.PushMetricsDto;
import org.springframework.stereotype.Service;

/**
 * push metrics
 *
 *
 */
@Service
public interface PushService {
    void pushMetricsData(PushMetricsDto pushMetricsData);

    PushMetricsDto getPushMetricData(final Long monitorId, final Long time);
}
