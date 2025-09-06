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

package org.apache.hertzbeat.collector.listener;

import lombok.AllArgsConstructor;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundDataStream;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.timer.Timeout;

import java.util.concurrent.TimeUnit;

/**
 * 周期任务专用
 */
@AllArgsConstructor
public class RerunDataStream implements ContextBoundDataStream<Object> {
    private TimerDispatch timerDispatch;

    @Override
    public void execute(Context context, Object data) {
        Job job = context.get(ContextKey.JOB);
        Timeout timeout = context.get(ContextKey.TIMEOUT);

        if (!timeout.isCancelled()) {
            long spendTime = System.currentTimeMillis() - job.getDispatchTime();
            long interval = job.getInterval() - spendTime / 1000L;
            interval = interval <= 0 ? 0 : interval;
            timerDispatch.cyclicJob((WheelTimerTask) timeout.task(), interval, TimeUnit.SECONDS);
        }
    }

    @Override
    public void whenException(Context context, Object data, Throwable throwable) {

    }
}
