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

import org.apache.hertzbeat.collector.constants.HandlerType;
import org.apache.hertzbeat.collector.handler.ContextBoundDataStream;
import org.apache.hertzbeat.collector.handler.TaskChain;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 *
 */
public abstract class AbstractContextBoundTaskChain<T> implements TaskChain<T> {
    protected final Map<HandlerType, List<ContextBoundDataStream<T>>> contextBoundHandlerMap = new HashMap<>();

    @Override
    public void addLast(HandlerType handlerType, ContextBoundDataStream<T> handler) {
        if (!contextBoundHandlerMap.containsKey(handlerType)) {
            contextBoundHandlerMap.put(handlerType, new ArrayList<>());
        }

        contextBoundHandlerMap.get(handlerType).add(handler);
    }
}
