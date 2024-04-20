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

package org.apache.hertzbeat.common.entity.job;


import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Collect task details
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
     * Is hide this app in main menus layout, only for app type, default true.
     */
    private boolean hide = true;
    /**
     * Large categories of monitoring   
     * service-application service monitoring db-database
     * monitoring custom-custom monitoring os-operating system monitoring...
     */
    private String category;
    /**
     * Type of monitoring eg: linux | mysql | jvm
     */
    private String app;
    /**
     * The internationalized name of the monitoring type
     * PING CONNECT
     */
    private Map<String, String> name;
    /**
     * The description and help of the monitoring type
     * PING CONNECT - You can use the IP address or
     * domain address of the peer service to monitor the PING connectivity between the local network and the peer network.
     */
    private Map<String, String> help;
    /**
     * The monitor help link
     */
    private Map<String, String> helpLink;
    /**
     * Task dispatch start timestamp
     */
    private long timestamp;
    /**
     * Task collection time interval (unit: second) eg: 30,60,600
     */
    private long interval = 600L;
    /**
     * Whether it is a recurring periodic task true is yes, false is no
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
     */
    private List<Configmap> configmap;

    /**
     * the collect data response metrics as env configmap for other collect use. ^o^xxx^o^
     */
    @JsonIgnore
    private Map<String, Configmap> envConfigmaps;

    /**
     * collector use - timestamp when the task was scheduled by the time wheel
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
     */
    @JsonIgnore
    private transient List<CollectRep.MetricsData> responseDataTemp;

    /**
     * collector use - construct to initialize metrics execution view
     */
    public synchronized void constructPriorMetrics() {
        Map<Byte, List<Metrics>> map = metrics.stream()
                .peek(metric -> {
                    // Determine whether to configure aliasFields If not, configure the default
                    if ((metric.getAliasFields() == null || metric.getAliasFields().isEmpty()) && metric.getFields() != null) {
                        metric.setAliasFields(metric.getFields().stream().map(Metrics.Field::getField).collect(Collectors.toList()));
                    }
                    // Set the default metrics execution priority, if not filled, the default last priority
                    if (metric.getPriority() == null) {
                        metric.setPriority(Byte.MAX_VALUE);
                    }
                })
                .collect(Collectors.groupingBy(Metrics::getPriority));
        // Construct a linked list of task execution order of the metrics
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
     *
     * @param metrics Current Metrics
     * @param first   Is it the first time to get  
     * @return Metrics Tasks       
     * Returning null means: the job has been completed, and the collection of all metrics has ended
     * Returning the empty set metrics that there are still metrics collection tasks at the current
     * level that have not been completed,and the next level metrics task collection cannot be performed.
     * The set returned empty means that there are still indicator collection tasks unfinished at the current level,
     * and the task collection at the next level cannot be carried out
     * Returns a set of data representation: get the next set of priority index collcet tasks
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
        // deep clone
        return JsonUtil.fromJson(JsonUtil.toJson(this), getClass());
    }
}
