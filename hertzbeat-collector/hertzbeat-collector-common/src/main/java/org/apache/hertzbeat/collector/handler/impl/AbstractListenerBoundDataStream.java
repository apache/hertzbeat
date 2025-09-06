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

import lombok.Getter;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.constants.ContextStatus;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundDataStream;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;

import java.util.ArrayList;
import java.util.List;

/**
 *
 */
public abstract class AbstractListenerBoundDataStream<T, R> implements ContextBoundDataStream<T> {
    @Getter
    private final List<? extends ContextBoundListener<R>> dataListenerList = new ArrayList<>();
    @Getter
    private final List<? extends ContextBoundListener<R>> onCompleteListenerList = new ArrayList<>();

    @Override
    public void execute(Context context, T data) {
        long startTime = System.currentTimeMillis();
        context.put(ContextKey.METRICS_COLLECT_START_TIME, startTime);

        R executeResult = executeWithResponse(context, data);

        runListener(context, executeResult);

        runOnCompleteListener(context, executeResult);
    }

    public R executeWithResponse(Context context, T data) {
        // no-op
        return null;
    }

    @Override
    public void whenException(Context context, T data, Throwable throwable) {
        // no-op
    }

    private void runListener(Context context, R executeResult) {
        if (CollectionUtils.isEmpty(dataListenerList)) {
            return;
        }

        if (ContextStatus.STOP.equals(context.getStatus())) {
            return;
        }

        //todo 异常处理
        for (ContextBoundListener<R> listener : dataListenerList) {
            listener.execute(context, executeResult);

            if (ContextStatus.STOP.equals(context.getStatus())) {
                break;
            }
        }
    }

    private void runOnCompleteListener(Context context, R executeResult) {
        if (CollectionUtils.isEmpty(onCompleteListenerList)) {
            return;
        }

        for (ContextBoundListener<R> listener : onCompleteListenerList) {
            listener.execute(context, executeResult);
        }
    }
}
