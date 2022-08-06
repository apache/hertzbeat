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
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.message.CollectRep;

/**
 * Collection data scheduler interface
 * 采集数据调度器接口
 *
 * @author tomsun28
 * @date 2021/11/2 11:20
 */
public interface CollectDataDispatch {

    /**
     * Processing and distributing collection result data
     * 处理分发采集结果数据
     *
     * @param timeout     time wheel timeout        时间轮timeout
     * @param metrics     The following indicator group collection tasks    下面的指标组采集任务
     * @param metricsData Collect result data       采集结果数据
     */
    void dispatchCollectData(Timeout timeout, Metrics metrics, CollectRep.MetricsData metricsData);

}
