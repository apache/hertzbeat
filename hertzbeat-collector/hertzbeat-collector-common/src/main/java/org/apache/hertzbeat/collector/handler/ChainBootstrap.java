package org.apache.hertzbeat.collector.handler;

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.handler.impl.AbstractListenerBoundHandler;

import java.util.ArrayList;
import java.util.List;

/**
 *
 */
@Slf4j
public class ChainBootstrap {
    @Setter
    private Context context;
    private TaskChain<?> taskChain;
    private WorkerPool workerPool;
    private final List<ContextBoundHandler> contextBoundHandlerList = new ArrayList<>();
    private final List<ContextBoundHandler> onCompleteContextBoundHandlerList = new ArrayList<>();
    private final List<ContextBoundListener> dataListenerList = new ArrayList<>();
    private final List<ContextBoundListener> onCompleteListenerList = new ArrayList<>();

    public static ChainBootstrap withContext(Context context) {
        ChainBootstrap bootstrap = new ChainBootstrap();
        bootstrap.setContext(context);
        return bootstrap;
    }

    public ChainBootstrap withChain(TaskChain<?> taskChain) {
        this.taskChain = taskChain;
        return this;
    }

    public ChainBootstrap withWorkerPool(WorkerPool workerPool) {
        this.workerPool = workerPool;
        return this;
    }

    public <T> ChainBootstrap addContext(Object key, T value) {
        context.put(key, value);
        return this;
    }

    public ChainBootstrap handler(ContextBoundHandler contextBoundHandler) {
        contextBoundHandlerList.add(contextBoundHandler);
        return this;
    }

    public ChainBootstrap onComplete(ContextBoundHandler contextBoundHandler) {
        onCompleteContextBoundHandlerList.add(contextBoundHandler);
        return this;
    }

    public ChainBootstrap addListener(ContextBoundListener dataListener) {
        dataListenerList.add(dataListener);
        return this;
    }

    public ChainBootstrap addOnCompleteListener(ContextBoundListener dataListener) {
        onCompleteListenerList.add(dataListener);
        return this;
    }

    public void start() {
        if (taskChain == null || context == null) {
            log.error("Failed to start chain boostrap due to null value of Context or TaskChain");
            return;
        }

        for (ContextBoundHandler contextBoundHandler : contextBoundHandlerList) {
            if (contextBoundHandler instanceof AbstractListenerBoundHandler listenerBoundHandler) {
                if (CollectionUtils.isNotEmpty(dataListenerList)) {
                    listenerBoundHandler.getDataListenerList().addAll(dataListenerList);
                }
                if (CollectionUtils.isNotEmpty(onCompleteListenerList)) {
                    listenerBoundHandler.getOnCompleteListenerList().addAll(onCompleteListenerList);
                }
            }

            taskChain.addLast(HandlerType.NORMAL, contextBoundHandler);
        }

        onCompleteContextBoundHandlerList.forEach(handler -> taskChain.addLast(HandlerType.ON_COMPLETE, handler));

        if (workerPool != null) {
            workerPool.executeJob(() -> taskChain.execute(context));
        } else {
            taskChain.execute(context);
        }
    }
}
