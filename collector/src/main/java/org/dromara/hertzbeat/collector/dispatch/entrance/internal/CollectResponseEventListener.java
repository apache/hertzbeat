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

package org.dromara.hertzbeat.collector.dispatch.entrance.internal;

import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.EventListener;
import java.util.List;

/**
 * One-time collection task response result listener
 * 一次性采集任务响应结果监听器
 * @author tomsun28
 *
 */
public interface CollectResponseEventListener extends EventListener {

    /**
     * Collection task completion result notification
     * 采集任务完成结果通知
     * @param responseMetrics Response Metrics
     */
    default void response(List<CollectRep.MetricsData> responseMetrics) {}
}
