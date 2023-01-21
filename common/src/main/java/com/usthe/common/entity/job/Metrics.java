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
import com.usthe.common.entity.job.protocol.*;
import com.usthe.common.entity.message.CollectRep;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Details of the collection of indicators collected by monitoring
 * eg: cpu | memory | health
 * 监控采集的指标集合详情 eg: cpu | memory | health
 *
 * @author tomsun28
 * @date 2021/10/17 21:24
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class Metrics {

    /**
     * public property-name eg: cpu | memory | health
     * 公共属性-名称 eg: cpu | memory | health
     */
    private String name;
    /**
     * 公共属性-采集监控协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
     */
    private String protocol;
    /**
     * Range (0-127) indicator group scheduling priority, the smaller the value, the higher the priority
     * The collection task of the next priority indicator group will be scheduled only after the scheduled collection with the higher priority is completed.
     * The default priority of the availability indicator group is 0, and the range of other common indicator groups is 1-127, that is,
     * the subsequent indicator group tasks will only be scheduled after the availability is collected successfully.
     * 范围(0-127)指标组调度优先级,数值越小优先级越高
     * 优先级高的调度采集完成后才会调度下一优先级的指标组采集任务
     * 可用性指标组(availability)默认优先级为0,其它普通指标组范围为1-127,即需要等availability采集成功后才会调度后面的指标组任务
     */
    private Byte priority;
    /**
     * Is it visible true or false
     * if false, web ui will not see this metrics.
     */
    private boolean visible = true;
    /**
     * Public attribute - collection and monitoring final result attribute set eg: speed | times | size
     * 公共属性-采集监控的最终结果属性集合 eg: speed | times | size
     */
    private List<Field> fields;
    /**
     * Public attribute - collection and monitoring pre-query attribute set eg: size1 | size2 | speedSize
     * 公共属性-采集监控的前置查询属性集合 eg: size1 | size2 | speedSize
     */
    private List<String> aliasFields;
    /**
     * Public attribute - expression calculation, map the pre-query attribute (pre Fields) with the final attribute (fields), and calculate the final attribute (fields) value
     * 公共属性-表达式计算，将前置查询属性(preFields)与最终属性(fields)映射,计算出最终属性(fields)值
     * eg: size = size1 + size2, speed = speedSize
     * https://www.yuque.com/boyan-avfmj/aviatorscript/ban32m
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
     * 使用http协议的监控配置信息
     */
    private HttpProtocol http;
    /**
     * Monitoring configuration information for ping using the icmp protocol
     * 使用icmp协议进行ping的监控配置信息
     */
    private IcmpProtocol icmp;
    /**
     * Monitoring configuration information using the telnet protocol
     * 使用telnet协议的监控配置信息
     */
    private TelnetProtocol telnet;
    /**
     * Use tcp or ucp implemented by socket for service port detection configuration information
     * 使用socket实现的tcp或ucp进行服务端口探测配置信息
     */
    private TcpUdpProtocol tcpUdp;
    /**
     * Database configuration information implemented using the public jdbc specification
     * 使用公共的jdbc规范实现的数据库配置信息
     */
    private JdbcProtocol jdbc;
    /**
     * Monitoring configuration information using the public ssh protocol
     * 使用公共的ssh协议的监控配置信息
     */
    private SshProtocol ssh;
    /**
     * Monitoring configuration information using the public redis protocol
     * 使用公共的redis协议的监控配置信息
     */
    private RedisProtocol redis;
    /**
     * Monitoring configuration information using the public mongodb protocol
     * 使用公共的mongodb协议的监控配置信息
     */
    private MongodbProtocol mongodb;
    /**
     * Get monitoring configuration information using public JMX protocol
     * 使用公共JMX协议获取监控配置信息
     */
    private JmxProtocol jmx;
    /**
     * Monitoring configuration information using the public snmp protocol
     * 使用公共的snmp协议的监控配置信息
     */
    private SnmpProtocol snmp;
    /**
     * Monitoring configuration information using the public ftp protocol
     * 使用公共的ftp协议的监控配置信息
     */
    private FtpProtocol ftp;

    /**
     * collector use - Temporarily store subTask indicator group response data
     * collector使用 - 临时存储分级任务指标响应数据
     */
    @JsonIgnore
    private transient AtomicReference<CollectRep.MetricsData> subTaskDataRef;

    /**
     * collector use - Temporarily store subTask running num
     * collector使用 - 分级任务正在运行中的数量
     */
    @JsonIgnore
    private transient AtomicInteger subTaskNum;

    /**
     * collector use - Temporarily store subTask id
     * collector使用 - 分级任务ID
     */
    @JsonIgnore
    private transient Integer subTaskId;

    /**
     * is has subTask
     * @return true - has
     */
    public boolean isHasSubTask() {
        return subTaskNum != null;
    }

    /**
     * consume subTask
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

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Field {
        /**
         * Indicator name
         * 指标名称
         */
        private String field;
        /**
         * Indicator type 0-number: number 1-string: string
         * 指标类型 0-number:数字 1-string:字符串
         */
        private byte type = 1;
        /**
         * Whether this field is the instance primary key
         * 此字段是否为实例主键
         */
        private boolean instance = false;
        /**
         * Indicator unit
         * 指标单位
         */
        private String unit;
    }
}
