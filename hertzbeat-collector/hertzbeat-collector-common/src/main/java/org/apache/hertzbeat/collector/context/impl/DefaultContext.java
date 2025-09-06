package org.apache.hertzbeat.collector.context.impl;

import org.apache.hertzbeat.collector.context.AbstractInmemoryContext;

/**
 *
 */
public class DefaultContext extends AbstractInmemoryContext {
    private DefaultContext() {
    }

    public static DefaultContext newInstance() {
        return new DefaultContext();
    }
}
