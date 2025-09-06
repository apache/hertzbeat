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
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.CollectTaskTimeoutMonitor;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;

/**
 *
 */
@AllArgsConstructor
public class RemoveTimeoutMonitorListener implements ContextBoundListener<Object> {
    private CollectTaskTimeoutMonitor collectTaskTimeoutMonitor;

    @Override
    public void execute(Context context, Object data) {
        String metricsKey = context.get(ContextKey.METRICS_KEY);
        if (StringUtils.isBlank(metricsKey)) {
            return;
        }

        collectTaskTimeoutMonitor.removeMetrics(metricsKey);
    }
}
