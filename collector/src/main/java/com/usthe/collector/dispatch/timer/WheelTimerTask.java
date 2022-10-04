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

package com.usthe.collector.dispatch.timer;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.usthe.collector.dispatch.MetricsTaskDispatch;
import com.usthe.collector.util.CollectUtil;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Job;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.support.SpringContextHolder;
import com.usthe.common.util.AesUtil;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Timer Task implementation
 * TimerTask实现
 *
 * @author tomsun28
 * @date 2021/11/1 17:18
 */
@Slf4j
public class WheelTimerTask implements TimerTask {

    private final Job job;
    private final MetricsTaskDispatch metricsTaskDispatch;
    private static final Gson GSON = new Gson();

    public WheelTimerTask(Job job) {
        this.metricsTaskDispatch = SpringContextHolder.getBean(MetricsTaskDispatch.class);
        this.job = job;
        // The initialization job will monitor the actual parameter value and replace the collection field
        // 初始化job 将监控实际参数值对采集字段进行替换
        initJobMetrics(job);
    }

    /**
     * Initialize job fill information
     * 初始化job填充信息
     *
     * @param job job
     */
    private void initJobMetrics(Job job) {
        // 将监控实际参数值对采集字段进行替换
        List<Configmap> config = job.getConfigmap();
        Map<String, Configmap> configmap = config.stream()
                .peek(item -> {
                    // 对加密串进行解密
                    if (item.getType() == CommonConstants.PARAM_TYPE_PASSWORD && item.getValue() != null) {
                        String decodeValue = AesUtil.aesDecode(String.valueOf(item.getValue()));
                        if (decodeValue == null) {
                            log.error("Aes Decode value {} error.", item.getValue());
                        }
                        item.setValue(decodeValue);
                    } else if (item.getValue() != null && item.getValue() instanceof String) {
                        item.setValue(((String) item.getValue()).trim());
                    }
                })
                .collect(Collectors.toMap(Configmap::getKey, item -> item));
        List<Metrics> metrics = job.getMetrics();
        List<Metrics> metricsTmp = new ArrayList<>(metrics.size());
        for (Metrics metric : metrics) {
            JsonElement jsonElement = GSON.toJsonTree(metric);
            CollectUtil.replaceSmilingPlaceholder(jsonElement, configmap);
            metric = GSON.fromJson(jsonElement, Metrics.class);
            metricsTmp.add(metric);
        }
        job.setMetrics(metricsTmp);
    }


    @Override
    public void run(Timeout timeout) throws Exception {
        job.setDispatchTime(System.currentTimeMillis());
        metricsTaskDispatch.dispatchMetricsTask(timeout);
    }

    public Job getJob() {
        return job;
    }
}
