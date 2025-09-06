package org.apache.hertzbeat.collector.handler.impl;

import lombok.Getter;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.constants.ContextStatus;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundDataStream;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;

import java.util.ArrayList;
import java.util.List;

/**
 *
 */
public abstract class AbstractListenerBoundDataStream<T, R> implements ContextBoundDataStream<T> {
    @Getter
    private final List<? extends ContextBoundListener<R>> dataListenerList = new ArrayList<>();
    @Getter
    private final List<? extends ContextBoundListener<R>> onCompleteListenerList = new ArrayList<>();

    @Override
    public void execute(Context context, T data) {
        long startTime = System.currentTimeMillis();
        context.put(ContextKey.METRICS_COLLECT_START_TIME, startTime);

        R executeResult = executeWithResponse(context, data);

        runListener(context, executeResult);

        runOnCompleteListener(context, executeResult);
    }

    public R executeWithResponse(Context context, T data) {
        // no-op
        return null;
    }

    @Override
    public void whenException(Context context, T data, Throwable throwable) {
        // no-op
    }

    private void runListener(Context context, R executeResult) {
        if (CollectionUtils.isEmpty(dataListenerList)) {
            return;
        }

        if (ContextStatus.STOP.equals(context.getStatus())) {
            return;
        }

        //todo 异常处理
        for (ContextBoundListener<R> listener : dataListenerList) {
            listener.execute(context, executeResult);

            if (ContextStatus.STOP.equals(context.getStatus())) {
                break;
            }
        }
    }

    private void runOnCompleteListener(Context context, R executeResult) {
        if (CollectionUtils.isEmpty(onCompleteListenerList)) {
            return;
        }

        for (ContextBoundListener<R> listener : onCompleteListenerList) {
            listener.execute(context, executeResult);
        }
    }
}
