/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.handler;

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.WorkerPool;
import org.apache.hertzbeat.collector.handler.impl.AbstractListenerBoundDataStream;

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
    private final List<ContextBoundDataStream> contextBoundDataStreamList = new ArrayList<>();
    private final List<ContextBoundDataStream> onCompleteContextBoundDataStreamList = new ArrayList<>();
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

    public ChainBootstrap addDataStream(ContextBoundDataStream contextBoundDataStream) {
        contextBoundDataStreamList.add(contextBoundDataStream);
        return this;
    }

    public ChainBootstrap onComplete(ContextBoundDataStream contextBoundDataStream) {
        onCompleteContextBoundDataStreamList.add(contextBoundDataStream);
        return this;
    }

    public ChainBootstrap addListener(ContextBoundListener dataListener) {
        dataListenerList.add(dataListener);
        return this;
    }

    public ChainBootstrap onEachDataStreamComplete(ContextBoundListener dataListener) {
        onCompleteListenerList.add(dataListener);
        return this;
    }

    public void start() {
        if (taskChain == null || context == null) {
            log.error("Failed to start chain boostrap due to null value of Context or TaskChain");
            return;
        }

        for (ContextBoundDataStream contextBoundDataStream : contextBoundDataStreamList) {
            if (contextBoundDataStream instanceof AbstractListenerBoundDataStream listenerBoundHandler) {
                if (CollectionUtils.isNotEmpty(dataListenerList)) {
                    listenerBoundHandler.getDataListenerList().addAll(dataListenerList);
                }
                if (CollectionUtils.isNotEmpty(onCompleteListenerList)) {
                    listenerBoundHandler.getOnCompleteListenerList().addAll(onCompleteListenerList);
                }
            }

            taskChain.addLast(HandlerType.NORMAL, contextBoundDataStream);
        }

        onCompleteContextBoundDataStreamList.forEach(handler -> taskChain.addLast(HandlerType.ON_COMPLETE, handler));

        if (workerPool != null) {
            workerPool.executeJob(() -> taskChain.execute(context));
        } else {
            taskChain.execute(context);
        }
    }
}
