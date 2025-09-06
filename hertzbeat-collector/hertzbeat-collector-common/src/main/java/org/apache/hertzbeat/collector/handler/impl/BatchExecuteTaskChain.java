package org.apache.hertzbeat.collector.handler.impl;

import org.apache.hertzbeat.collector.constants.ContextStatus;
import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundDataStream;

import java.util.ArrayList;


/**
 *
 */
public class BatchExecuteTaskChain<T> extends AbstractContextBoundTaskChain<T> {
    @Override
    public void execute(Context context) {
        this.execute(context, null);
    }

    @Override
    public void execute(Context context, T data) {
        context.setStatus(ContextStatus.RUNNING);

        for (ContextBoundDataStream<T> contextBoundDataStream : contextBoundHandlerMap.getOrDefault(HandlerType.NORMAL, new ArrayList<>())) {
            runHandler(context, data, contextBoundDataStream);

            if (ContextStatus.TRUNCATE_HANDLER.equals(context.getStatus()) || ContextStatus.STOP.equals(context.getStatus())) {
                break;
            }

            // in order to init error info for the next loop
            context.setError(null);
        }

        contextBoundHandlerMap.getOrDefault(HandlerType.ON_COMPLETE, new ArrayList<>()).forEach(handler -> runHandler(context, data, handler));
    }

    private static <T> void runHandler(Context context, T data, ContextBoundDataStream<T> contextBoundDataStream) {
        try {
            contextBoundDataStream.execute(context, data);
        } catch (Exception exception) {
            context.setError(exception);
            contextBoundDataStream.whenException(context, data, exception);
        }
    }
}
