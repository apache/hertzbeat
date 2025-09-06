package org.apache.hertzbeat.collector.listener;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 *
 * @author Calvin
 * @date 9/1/2025
 */
@Slf4j
public class ValidateResponseListener implements ContextBoundListener<CollectRep.MetricsData.Builder> {

    @Override
    public void execute(Context context, CollectRep.MetricsData.Builder data) {
        long startTime = context.get(ContextKey.METRICS_COLLECT_START_TIME);
        Metrics metrics = context.get(ContextKey.METRICS);

        this.validateResponse(startTime, metrics, data);
    }

    private void validateResponse(long startTime, Metrics metrics, CollectRep.MetricsData.Builder builder) {
        long endTime = System.currentTimeMillis();
        builder.setTime(endTime);
        long allTime = endTime - startTime;
        if (builder.getCode() != CollectRep.Code.SUCCESS) {
            log.info("[Metrics: {}][Collect Failed, Run {}ms] Reason: {}", metrics.getName(), allTime, builder.getMsg());
        } else {
            log.info("[Metrics: {}][Collect Success, Run {}ms].", metrics.getName(), allTime);
        }
    }
}
