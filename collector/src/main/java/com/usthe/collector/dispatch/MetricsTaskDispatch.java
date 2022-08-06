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

package com.usthe.collector.dispatch;

import com.usthe.collector.dispatch.timer.Timeout;

/**
 * Metric group collection task scheduler interface
 * 指标组采集任务调度器接口
 *
 * @author tomsun28
 * @date 2021/11/2 11:19
 */
public interface MetricsTaskDispatch {

    /**
     * schedule     调度
     *
     * @param timeout timeout
     */
    void dispatchMetricsTask(Timeout timeout);
}
