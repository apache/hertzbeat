package org.apache.hertzbeat.collector.listener;

import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.constants.ContextStatus;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;
import org.apache.hertzbeat.common.timer.Timeout;

/**
 *
 */
public class CommonMetricsDataListener<T> implements ContextBoundListener<T> {
    @Override
    public void execute(Context context, T data) {
        Timeout timeout = context.get(ContextKey.TIMEOUT);

        if (timeout == null || timeout.isCancelled()) {
            context.setStatus(ContextStatus.STOP);
        }
    }
}
