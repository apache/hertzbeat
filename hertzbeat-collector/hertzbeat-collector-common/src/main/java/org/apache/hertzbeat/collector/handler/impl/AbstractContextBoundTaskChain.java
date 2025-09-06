package org.apache.hertzbeat.collector.handler.impl;

import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.handler.ContextBoundHandler;
import org.apache.hertzbeat.collector.handler.TaskChain;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 *
 */
public abstract class AbstractContextBoundTaskChain<T> implements TaskChain<T> {
    protected final Map<HandlerType, List<ContextBoundHandler<T>>> contextBoundHandlerMap = new HashMap<>();

    @Override
    public void addLast(HandlerType handlerType, ContextBoundHandler<T> handler) {
        if (!contextBoundHandlerMap.containsKey(handlerType)) {
            contextBoundHandlerMap.put(handlerType, new ArrayList<>());
        }

        contextBoundHandlerMap.get(handlerType).add(handler);
    }
}
