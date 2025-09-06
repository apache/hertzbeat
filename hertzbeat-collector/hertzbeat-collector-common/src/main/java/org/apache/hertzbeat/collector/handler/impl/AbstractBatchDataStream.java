package org.apache.hertzbeat.collector.handler.impl;

import lombok.Setter;
import org.apache.hertzbeat.collector.context.Context;

import java.util.List;

/**
 *
 */
public abstract class AbstractBatchDataStream<T, R> extends AbstractListenerBoundDataStream<T, R> {
    @Setter
    protected List<T> sourceDataList;

    @Override
    public void execute(Context context, T data) {
        for (T t : sourceDataList) {
            super.execute(context, t);
        }
    }
}
