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
import org.apache.hertzbeat.common.entity.job.protocol.*;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.job.protocol.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Details of the monitoring metrics collected 
 * eg: cpu | memory | health
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class Metrics {

    /**
     * public property-name eg: cpu | memory | health
     */
    private String name;
    /**
     * metrics name's i18n value
     * zh-CN: CPU信息
     * en-US: CPU Info
     */
    private Map<String, String> i18n;
    /**
     * collect protocol eg: sql, ssh, http, telnet, wmi, snmp, sdk
     */
    private String protocol;
    /**
     * Range (0-127) metrics scheduling priority, the smaller the value, the higher the priority
     * The collection task of the next priority metrics will be scheduled only after the scheduled collection with the higher priority is completed.
     * The default priority of the availability metrics is 0, and the range of other common metrics is 1-127, that is,
     * the subsequent metrics tasks will only be scheduled after the availability is collected successfully.
     */
    private Byte priority;
    /**
     * Is it visible true or false
     * if false, web ui will not see this metrics.
     */
    private boolean visible = true;
    /**
     * Public attribute - collection and monitoring final result attribute set eg: speed | times | size
     */
    private List<Field> fields;
    /**
     * Public attribute - collection and monitoring pre-query attribute set eg: size1 | size2 | speedSize
     */
    private List<String> aliasFields;
    /**
     * Public attribute - expression calculation, map the pre-query attribute (pre Fields)
     * with the final attribute (fields), and calculate the final attribute (fields) value
     * eg: size = size1 + size2, speed = speedSize
     * <a href="https://www.yuque.com/boyan-avfmj/aviatorscript/ban32m">www.yuque.com/boyan-avfmj/aviatorscript/ban32m</a>
     */
    private List<String> calculates;
    /**
     * unit conversion expr
     * eg:
     * - heap_used=B->MB
     * - heap_total=B->MB
     * - disk_free=B->GB
     * - disk_total=B->GB
     */
    private List<String> units;
    /**
     * Monitoring configuration information using the http protocol
     */
    private HttpProtocol http;
    /**
     * Monitoring configuration information for ping using the icmp protocol
     */
    private IcmpProtocol icmp;
    /**
     * Monitoring configuration information using the telnet protocol
     */
    private TelnetProtocol telnet;
    /**
     * Monitoring configuration information using the public smtp protocol
     */
    private SmtpProtocol smtp;
    /**
     * Monitoring configuration information using the public ntp protocol
     */
    private NtpProtocol ntp;
    /**
     * Monitoring configuration information using the websocket protocol
     */
    private WebsocketProtocol websocket;
    /**
     * Monitoring configuration information using the memcached protocol
     */
    private MemcachedProtocol memcached;
    /**
     * Monitoring configuration information using the nebulaGraph protocol
     */
    private NebulaGraphProtocol nebulaGraph;
    /**
     * Use udp implemented by socket for service port detection configuration information
     */
    private UdpProtocol udp;
    /**
     * Database configuration information implemented using the public jdbc specification
     */
    private JdbcProtocol jdbc;
    /**
     * Monitoring configuration information using the public ssh protocol
     */
    private SshProtocol ssh;
    /**
     * Monitoring configuration information using the public redis protocol
     */
    private RedisProtocol redis;
    /**
     * Monitoring configuration information using the public mongodb protocol
     */
    private MongodbProtocol mongodb;
    /**
     * Get monitoring configuration information using public JMX protocol
     */
    private JmxProtocol jmx;
    /**
     * Monitoring configuration information using the public snmp protocol
     */
    private SnmpProtocol snmp;
    /**
     * Monitoring configuration information using the public ftp protocol
     */
    private FtpProtocol ftp;
    /**
     * Monitoring configuration information using the public rocketmq protocol
     */
    private RocketmqProtocol rocketmq;
    /**
     * Monitoring configuration information using push style
     */
    private PushProtocol push;
    /**
     * Monitoring configuration information using the public prometheus protocol
     */
    private PrometheusProtocol prometheus;
    /**
     * Monitoring configuration information using the public DNS protocol
     */
    private DnsProtocol dns;
    /**
     * Monitoring configuration information using the public Nginx protocol
     */
    private NginxProtocol nginx;
    /**
     * Monitoring configuration information using the public Nginx protocol
     */
    private Pop3Protocol pop3;
    /**
     * Monitoring configuration information using the public http_sd protocol
     */
    private HttpsdProtocol httpsd;

    /**
     * collector use - Temporarily store subTask metrics response data
     */
    @JsonIgnore
    private transient AtomicReference<CollectRep.MetricsData> subTaskDataRef;

    /**
     * collector use - Temporarily store subTask running num
     */
    @JsonIgnore
    private transient AtomicInteger subTaskNum;

    /**
     * collector use - Temporarily store subTask id
     */
    @JsonIgnore
    private transient Integer subTaskId;

    /**
     * is has subTask
     *
     * @return true - has
     */
    public boolean isHasSubTask() {
        return subTaskNum != null;
    }

    /**
     * consume subTask
     *
     * @param metricsData response data
     * @return is last task?
     */
    public boolean consumeSubTaskResponse(CollectRep.MetricsData metricsData) {
        if (subTaskNum == null) {
            return true;
        }
        synchronized (subTaskNum) {
            int index = subTaskNum.decrementAndGet();
            if (subTaskDataRef.get() == null) {
                subTaskDataRef.set(metricsData);
            } else {
                if (metricsData.getValuesCount() >= 1) {
                    CollectRep.MetricsData.Builder dataBuilder = CollectRep.MetricsData.newBuilder(subTaskDataRef.get());
                    for (CollectRep.ValueRow valueRow : metricsData.getValuesList()) {
                        if (valueRow.getColumnsCount() == dataBuilder.getFieldsCount()) {
                            dataBuilder.addValues(valueRow);
                        } else {
                            log.error("consume subTask data value not mapping filed");
                        }
                    }
                    subTaskDataRef.set(dataBuilder.build());
                }
            }
            return index == 0;
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        Metrics metrics = (Metrics) o;
        return name.equals(metrics.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }

    /**
     * Metrics.Field
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Field {
        /**
         * Metric name
         */
        private String field;
        /**
         * metric field name's i18n value
         * CPU Version
         */
        private Map<String, String> i18n;
        /**
         * Metric type 0-number: number 1-string: string
         */
        private byte type = 1;
        /**
         * Whether this field is the instance
         */
        private boolean instance = false;
        /**
         * Whether this field is the label
         */
        private boolean label = false;
        /**
         * Metric unit
         */
        private String unit;
    }
}
