package org.apache.hertzbeat.collector.listener;

import lombok.AllArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.CollectTaskTimeoutMonitor;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;

/**
 *
 */
@AllArgsConstructor
public class RemoveTimeoutMonitorListener implements ContextBoundListener<Object> {
    private CollectTaskTimeoutMonitor collectTaskTimeoutMonitor;

    @Override
    public void execute(Context context, Object data) {
        String metricsKey = context.get(ContextKey.METRICS_KEY);
        if (StringUtils.isBlank(metricsKey)) {
            return;
        }

        collectTaskTimeoutMonitor.removeMetrics(metricsKey);
    }
}
