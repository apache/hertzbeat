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

package org.dromara.hertzbeat.common.entity.job;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.manager.ParamDefine;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.JsonUtil;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Collect task details
 * @author tomsun28
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class Job {

    /**
     * Task Job id
     */
    private long id;
    /**
     * Tenant id
     */
    private long tenantId = 0;
    /**
     * Monitoring Task ID
     */
    private long monitorId;
    /**
     * Large categories of monitoring   
     * service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring...
     */
    private String category;
    /**
     * Type of monitoring eg: linux | mysql | jvm
     */
    private String app;
    /**
     * The internationalized name of the monitoring type   
     * zh-CN: PING连通性
     * en-US: PING CONNECT
     */
    private Map<String, String> name;
    /**
     * The description and help of the monitoring type
     * zh-CN: PING连通性 - 支持您使用在线配置对端服务的IP或域名地址，监控本机网络与对端网络的PING可连通性。
     * en-US: PING CONNECT - You can use the IP address or domain address of the peer service to monitor the PING connectivity between the local network and the peer network.
     */
    private Map<String, String> help;
    /**
     * The monitor help link
     */
    private Map<String, String> helpLink;
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
     * monitor input need params
     */
    private List<ParamDefine> params;
    /**
     * Metrics configuration eg: cpu memory
     * eg: cpu memory
     */
    private List<Metrics> metrics;
    /**
     * Monitoring configuration parameter properties and values eg: username password timeout host
     * 监控配置参数属性及值 eg: username password timeout host
     */
    private List<Configmap> configmap;

    /**
     * the collect data response metrics as env configmap for other collect use. ^o^xxx^o^
     * 优先级高的采集响应单行指标可以作为后续优先级采集配置的环境变量 ^o^xxx^o^
     */
    @JsonIgnore
    private Map<String, Configmap> envConfigmaps;

    /**
     * collector use - timestamp when the task was scheduled by the time wheel
     * 任务被时间轮开始调度的时间戳
     */
    @JsonIgnore
    private transient long dispatchTime;
    
    /**
     * collector usage - metric group task execution priority view
     * 0 - availability
     * 1 - cpu | memory
     * 2 - health
     * 3 - otherMetrics
     * ....
     * 126 - otherMetrics
     * 127 - lastPriorMetrics
     */
    @JsonIgnore
    private transient LinkedList<Set<Metrics>> priorMetrics;

    /**
     * collector use - Temporarily store one-time task metrics response data
     * collector使用 - 临时存储一次性任务响应数据
     */
    @JsonIgnore
    private transient List<CollectRep.MetricsData> responseDataTemp;

    /**
     * collector use - construct to initialize metrics execution view
     * collector使用 - 构造初始化指标执行视图
     */
    public synchronized void constructPriorMetrics() {
        Map<Byte, List<Metrics>> map = metrics.stream()
                .peek(metric -> {
                    // Determine whether to configure aliasFields If not, configure the default
                    // 判断是否配置aliasFields 没有则配置默认
                    if ((metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) && metric.getFields() != null) {
                        metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
                    }
                    // Set the default metrics execution priority, if not filled, the default last priority
                    // 设置默认执行优先级,不填则默认最后优先级
                    if (metric.getPriority() == null) {
                        metric.setPriority(Byte.MAX_VALUE);
                    }
                })
                .collect(Collectors.groupingBy(Metrics::getPriority));
        // Construct a linked list of task execution order of the metrics
        // 构造采集任务执行顺序链表
        priorMetrics = new LinkedList<>();
        map.values().forEach(metric -> {
            Set<Metrics> metricsSet = Collections.synchronizedSet(new HashSet<>(metric));
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
        envConfigmaps = new HashMap<>(8);
    }

    /**
     * collector use - to get the next set of priority metric group tasks
     * collector使用 - 获取下一组优先级的采集任务
     *
     * @param metrics Current Metrics
     * @param first   Is it the first time to get  
     * @return Metrics Tasks       
     * Returning null means: the job has been completed, and the collection of all metrics has ended
     * 返回null表示：job已完成,所有采集任务结束
     * Returning the empty set metrics that there are still metrics collection tasks at the current
     * level that have not been completed,and the next level metrics task collection cannot be performed.
     * 返回empty的集合表示：当前级别下还有指标采集任务未结束,无法进行下一级别的任务采集
     * Returns a set of data representation: get the next set of priority index collcet tasks
     * 返回有数据集合表示：获取到下一组优先级的采集任务
     */
    public synchronized Set<Metrics> getNextCollectMetrics(Metrics metrics, boolean first) {
        if (priorMetrics == null || priorMetrics.isEmpty()) {
            return null;
        }
        Set<Metrics> metricsSet = priorMetrics.peek();
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
            priorMetrics.poll();
            if (priorMetrics.isEmpty()) {
                return null;
            }
            Set<Metrics> source = priorMetrics.peek();
            return new HashSet<>(source);
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

    public Map<String, Configmap> getEnvConfigmaps() {
        return envConfigmaps;
    }

    public void addEnvConfigmaps(Map<String, Configmap> envConfigmaps) {
        if (this.envConfigmaps == null) {
            this.envConfigmaps = envConfigmaps;
        } else {
            this.envConfigmaps.putAll(envConfigmaps);   
        }
    }

    @Override
    public Job clone() {
        // deep clone   深度克隆
        return JsonUtil.fromJson(JsonUtil.toJson(this), getClass());
    }
}
