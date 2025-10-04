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
