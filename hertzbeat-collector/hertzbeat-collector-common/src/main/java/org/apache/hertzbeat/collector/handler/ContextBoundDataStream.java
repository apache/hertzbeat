package org.apache.hertzbeat.collector.handler;

import org.apache.hertzbeat.collector.context.Context;

/**
 *
 */
public interface ContextBoundDataStream<T> {
    void execute(Context context, T data);

    void whenException(Context context, T data, Throwable throwable);
}
