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

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Schedule Distribution Task Configuration Properties
 * 调度分发任务配置属性
 *
 * @author tomsun28
 * @date 2021/10/16 14:54
 */
@Component
@ConfigurationProperties(prefix = "collector.dispatch")
public class DispatchProperties {

    /**
     * Scheduling entry configuration properties
     * 调度入口配置属性
     */
    private EntranceProperties entrance;

    /**
     * Schedule Data Export Configuration Properties
     * 调度数据出口配置属性
     */
    private ExportProperties export;

    public EntranceProperties getEntrance() {
        return entrance;
    }

    public void setEntrance(EntranceProperties entrance) {
        this.entrance = entrance;
    }

    public ExportProperties getExport() {
        return export;
    }

    public void setExport(ExportProperties export) {
        this.export = export;
    }

    /**
     * Scheduling entry configuration properties
     * The entry can be etcd information, http request, message middleware message request
     * <p>
     * 调度入口配置属性
     * 入口可以时etcd信息,http请求,消息中间件消息请求
     */
    public static class EntranceProperties {
        /**
         * etcd配置信息
         */
        private EtcdProperties etcd;

        public EtcdProperties getEtcd() {
            return etcd;
        }

        public void setEtcd(EtcdProperties etcd) {
            this.etcd = etcd;
        }

        public static class EtcdProperties {

            /**
             * Whether etcd scheduling is started
             * etcd调度是否启动
             */
            private boolean enabled = true;

            /**
             * etcd's connection endpoint url
             * etcd的连接端点url
             */
            private String[] endpoints = new String[]{"http://127.0.0.1:2379"};

            /**
             * etcd connection username
             * etcd连接用户名
             */
            private String username;

            /**
             * etcd connection password
             * etcd连接密码
             */
            private String password;

            /**
             * Valid time of etcd lease in seconds
             * etcd租约的有效时间 单位秒
             */
            private long ttl = 200;

            /**
             * Collector registration directory
             * 采集器注册目录
             */
            private String collectorDir = "/usthe/dispatch/collector/";

            /**
             * Task scheduling distribution directory
             * 任务调度分发目录
             */
            private String assignDir = "/usthe/dispatch/assign/";

            /**
             * task inventory
             * 任务详细目录
             */
            private String jobDir = "/usthe/dispatch/job/";

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String[] getEndpoints() {
                return endpoints;
            }

            public void setEndpoints(String[] endpoints) {
                this.endpoints = endpoints;
            }

            public String getUsername() {
                return username;
            }

            public void setUsername(String username) {
                this.username = username;
            }

            public String getPassword() {
                return password;
            }

            public void setPassword(String password) {
                this.password = password;
            }

            public long getTtl() {
                return ttl;
            }

            public void setTtl(long ttl) {
                this.ttl = ttl;
            }

            public String getCollectorDir() {
                return collectorDir;
            }

            public void setCollectorDir(String collectorDir) {
                this.collectorDir = collectorDir;
            }

            public String getAssignDir() {
                return assignDir;
            }

            public void setAssignDir(String assignDir) {
                this.assignDir = assignDir;
            }

            public String getJobDir() {
                return jobDir;
            }

            public void setJobDir(String jobDir) {
                this.jobDir = jobDir;
            }
        }
    }

    /**
     * Schedule Data Export Configuration Properties
     * 调度数据出口配置属性
     */
    public static class ExportProperties {

        /**
         * kafka configuration information
         * kafka配置信息
         */
        private KafkaProperties kafka;

        public KafkaProperties getKafka() {
            return kafka;
        }

        public void setKafka(KafkaProperties kafka) {
            this.kafka = kafka;
        }

        public static class KafkaProperties {
            /**
             * Whether the kafka data export is started
             * kafka数据出口是否启动
             */
            private boolean enabled = true;

            /**
             * kafka's connection server url
             * kafka的连接服务器url
             */
            private String servers = "http://127.0.0.1:2379";
            /**
             * Topic name to send data to
             * 发送数据的topic名称
             */
            private String topic;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getServers() {
                return servers;
            }

            public void setServers(String servers) {
                this.servers = servers;
            }

            public String getTopic() {
                return topic;
            }

            public void setTopic(String topic) {
                this.topic = topic;
            }
        }
    }
}