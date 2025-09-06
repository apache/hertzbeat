package org.apache.hertzbeat.collector.handler;

import org.apache.hertzbeat.collector.context.Context;

/**
 */
public interface ContextBoundListener<T> {
    void execute(Context context, T data);
}
