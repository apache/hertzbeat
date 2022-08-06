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

package com.usthe.common.entity.job;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.GsonUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Collect task details
 * 采集任务详情
 *
 * @author tomsun28
 * @date 2021/10/17 21:19
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class Job {

    private static final String AVAILABILITY = "availability";

    /**
     * Task id      任务ID
     */
    private long id;
    /**
     * Monitoring ID Application ID
     * 监控ID 应用ID
     */
    private long monitorId;
    /**
     * Large categories of monitoring       监控的大类别
     * service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
     * service-应用服务监控 db-数据库监控 custom-自定义监控 os-操作系统监控
     */
    private String category;
    /**
     * Type of monitoring eg: linux | mysql | jvm
     * 监控的类型 eg: linux | mysql | jvm
     */
    private String app;
    /**
     * The internationalized name of the monitoring type    监控类型的国际化名称
     * zh-CN: PING连通性
     * en-US: PING CONNECT
     */
    private Map<String, String> name;
    /**
     * Task dispatch start timestamp
     * 任务派发开始时间戳
     */
    private long timestamp;
    /**
     * Task collection time interval (unit: second) eg: 30,60,600
     * 任务采集时间间隔(单位秒) eg: 30,60,600
     */
    private long interval = 600L;
    /**
     * Whether it is a recurring periodic task true is yes, false is no
     * 是否是循环周期性任务 true为是,false为否
     */
    private boolean isCyclic = false;
    /**
     * Indicator group configuration eg: cpu memory
     * 指标组配置 eg: cpu memory
     */
    private List<Metrics> metrics;
    /**
     * Monitoring configuration parameter properties and values eg: username password timeout host
     * 监控配置参数属性及值 eg: username password timeout host
     */
    private List<Configmap> configmap;

    /**
     * collector use - timestamp when the task was scheduled by the time wheel
     * collector使用 - 任务被时间轮开始调度的时间戳
     */
    @JsonIgnore
    private transient long dispatchTime;

    /**
     * collector use - task version, this field is not stored in etcd
     * collector使用 - 任务版本,此字段不存储于etcd
     */
    @JsonIgnore
    private transient long version;
    /**
     * collector usage - metric group task execution priority view
     * collector使用 - 指标组任务执行优先级视图
     * 0 - availability
     * 1 - cpu | memory
     * 2 - health
     * 3 - otherMetrics
     * ....
     * 126 - otherMetrics
     * 127 - lastPriorMetrics
     */
    @JsonIgnore
    private transient List<Set<Metrics>> priorMetrics;

    /**
     * collector use - Temporarily store one-time task indicator group response data
     * collector使用 - 临时存储一次性任务指标组响应数据
     */
    @JsonIgnore
    private transient List<CollectRep.MetricsData> responseDataTemp;

    /**
     * collector uses - construct to initialize metrics group execution view
     * collector使用 - 构造初始化指标组执行视图
     */
    public synchronized void constructPriorMetrics() {
        Map<Byte, List<Metrics>> map = metrics.stream()
                .peek(metric -> {
                    // Determine whether to configure aliasFields If not, configure the default
                    // 判断是否配置aliasFields 没有则配置默认
                    if (metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) {
                        metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
                    }
                    // Set the default indicator group execution priority, if not filled, the default last priority
                    // 设置默认的指标组执行优先级,不填则默认最后优先级
                    if (metric.getPriority() == null) {
                        metric.setPriority(Byte.MAX_VALUE);
                    }
                })
                .collect(Collectors.groupingBy(Metrics::getPriority));
        // Construct a linked list of task execution order of the indicator group
        // 构造指标组任务执行顺序链表
        priorMetrics = new LinkedList<>();
        map.values().forEach(metric -> {
            Set<Metrics> metricsSet = new HashSet<>(metric);
            priorMetrics.add(metricsSet);
        });
        priorMetrics.sort(Comparator.comparing(e -> {
            Optional<Metrics> metric = e.stream().findAny();
            if (metric.isPresent()) {
                return metric.get().getPriority();
            } else {
                return Byte.MAX_VALUE;
            }
        }));
    }

    /**
     * collector use - to get the next set of priority metric group tasks
     * collector使用 - 获取下一组优先级的指标组任务
     *
     * @param metrics Current indicator group       当前指标组
     * @param first   Is it the first time to get     是否是第一次获取
     * @return Metric Group Tasks       指标组任务
     * Returning null means: the job has been completed, and the collection of all indicator groups has ended
     * 返回null表示：job已完成,所有指标组采集结束
     * Returning the empty set indicates that there are still indicator group collection tasks at the current
     * level that have not been completed,and the next level indicator group task collection cannot be performed.
     * 返回empty的集合表示：当前级别下还有指标组采集任务未结束,无法进行下一级别的指标组任务采集
     * Returns a set of data representation: get the next set of priority index group tasks
     * 返回有数据集合表示：获取到下一组优先级的指标组任务
     */
    public synchronized Set<Metrics> getNextCollectMetrics(Metrics metrics, boolean first) {
        if (priorMetrics == null || priorMetrics.isEmpty()) {
            return null;
        }
        Set<Metrics> metricsSet = priorMetrics.get(0);
        if (first) {
            if (metricsSet.isEmpty()) {
                log.error("metrics must has one [availability] metrics at least.");

            }
            return metricsSet;
        }
        if (metrics == null) {
            log.error("metrics can not null when not first get");
            return null;
        }
        if (!metricsSet.remove(metrics)) {
            log.warn("Job {} appId {} app {} metrics {} remove empty error in priorMetrics.",
                    id, monitorId, app, metrics.getName());
        }
        if (metricsSet.isEmpty()) {
            priorMetrics.remove(0);
            if (priorMetrics.size() == 0) {
                return null;
            }
            return priorMetrics.get(0);
        } else {
            return Collections.emptySet();
        }
    }

    public void addCollectMetricsData(CollectRep.MetricsData metricsData) {
        if (responseDataTemp == null) {
            responseDataTemp = new LinkedList<>();
        }
        responseDataTemp.add(metricsData);
    }

    @Override
    public Job clone() {
        // deep clone   深度克隆
        return GsonUtil.fromJson(GsonUtil.toJson(this), Job.class);
    }
}
