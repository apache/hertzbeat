package org.apache.hertzbeat.collector.handler;

import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.context.Context;

/**
 *
 */
public interface TaskChain<T> {
    void execute(Context context);

    void execute(Context context, T data);

    void addLast(HandlerType handlerType, ContextBoundDataStream<T> handler);
}
