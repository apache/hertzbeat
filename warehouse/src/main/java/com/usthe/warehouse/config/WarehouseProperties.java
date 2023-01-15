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

package com.usthe.warehouse.config;

import org.apache.iotdb.session.util.Version;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.ZoneId;
import java.util.List;

/**
 * 数据仓储配置属性
 * @author tom
 * @date 2021/11/24 10:38
 */
@ConfigurationProperties(prefix = "warehouse")
public class WarehouseProperties {

    /**
     * 数据入口配置属性
     */
    private EntranceProperties entrance;

    /**
     * 数据存储配置属性
     */
    private StoreProperties store;

    public EntranceProperties getEntrance() {
        return entrance;
    }

    public void setEntrance(EntranceProperties entrance) {
        this.entrance = entrance;
    }

    public StoreProperties getStore() {
        return store;
    }

    public void setStore(StoreProperties store) {
        this.store = store;
    }

    /**
     * 数据入口配置属性
     * 入口可以是从kafka rabbitmq rocketmq等消息中间件获取数据
     */
    public static class EntranceProperties {

        /**
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
             * kafka数据入口是否启动
             */
            private boolean enabled = true;

            /**
             * kafka的连接服务器url
             */
            private String servers = "127.0.0.1:9092";
            /**
             * 接收数据的topic名称
             */
            private String topic;
            /**
             * 消费者组ID
             */
            private String groupId;

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

            public String getGroupId() {
                return groupId;
            }

            public void setGroupId(String groupId) {
                this.groupId = groupId;
            }
        }

    }

    /**
     * 调度数据出口配置属性
     */
    public static class StoreProperties {

        /**
         * 内存存储配置信息
         */
        private MemoryProperties memory;

        /**
         * influxdb配置信息
         */
        private InfluxdbProperties influxdb;
        /**
         * redis配置信息
         */
        private RedisProperties redis;
        /**
         * TdEngine配置信息
         */
        private TdEngineProperties tdEngine;
        /**
         * IoTDB配置信息
         */
        private IotDbProperties iotDb;

        public MemoryProperties getMemory() {
            return memory;
        }

        public void setMemory(MemoryProperties memory) {
            this.memory = memory;
        }

        public InfluxdbProperties getInfluxdb() {
            return influxdb;
        }

        public void setInfluxdb(InfluxdbProperties influxdb) {
            this.influxdb = influxdb;
        }

        public RedisProperties getRedis() {
            return redis;
        }

        public void setRedis(RedisProperties redis) {
            this.redis = redis;
        }

        public TdEngineProperties getTdEngine() {
            return tdEngine;
        }

        public void setTdEngine(TdEngineProperties tdEngine) {
            this.tdEngine = tdEngine;
        }

        public IotDbProperties getIotDb() {
            return iotDb;
        }

        public void setIotDb(IotDbProperties iotDb) {
            this.iotDb = iotDb;
        }

        public static class MemoryProperties {
            /**
             * 内存数据存储是否启动
             */
            private boolean enabled = true;
            /**
             * 内存存储map初始化大小
             */
            private Integer initSize = 1024;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public Integer getInitSize() {
                return initSize;
            }

            public void setInitSize(Integer initSize) {
                this.initSize = initSize;
            }
        }

        public static class InfluxdbProperties {
            /**
             * influxdb数据存储是否启动
             */
            private boolean enabled = false;
            /**
             * influxdb的连接服务器url
             */
            private String servers = "http://127.0.0.1:8086";
            /**
             * 认证token
             */
            private String token;
            /**
             * 仓库名称
             */
            private String bucket;
            /**
             * 组织名称
             */
            private String org;

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

            public String getToken() {
                return token;
            }

            public void setToken(String token) {
                this.token = token;
            }

            public String getBucket() {
                return bucket;
            }

            public void setBucket(String bucket) {
                this.bucket = bucket;
            }

            public String getOrg() {
                return org;
            }

            public void setOrg(String org) {
                this.org = org;
            }
        }

        public static class TdEngineProperties {
            /**
             * Whether the TdEngine data store is enabled
             */
            private boolean enabled = false;
            /**
             * TdEngine connect url
             */
            private String url = "jdbc:TAOS-RS://localhost:6041/demo";
            /**
             * tdengine driver, default restful driver
             */
            private String driverClassName = "com.taosdata.jdbc.rs.RestfulDriver";
            /**
             * tdengine username
             */
            private String username;
            /**
             * tdengine password
             */
            private String password;
            /**
             * auto create table's string column define max length : NCHAR(200)
             */
            private int tableStrColumnDefineMaxLength = 200;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getUrl() {
                return url;
            }

            public void setUrl(String url) {
                this.url = url;
            }

            public String getDriverClassName() {
                return driverClassName;
            }

            public void setDriverClassName(String driverClassName) {
                this.driverClassName = driverClassName;
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

            public int getTableStrColumnDefineMaxLength() {
                return tableStrColumnDefineMaxLength;
            }

            public void setTableStrColumnDefineMaxLength(int tableStrColumnDefineMaxLength) {
                this.tableStrColumnDefineMaxLength = tableStrColumnDefineMaxLength;
            }
        }

        public static class RedisProperties {
            /**
             * redis数据存储是否启动
             */
            private boolean enabled = false;
            /**
             * redis 主机host
             */
            private String host = "127.0.0.1";
            /**
             * redis 主机端口
             */
            private Integer port = 6379;
            /**
             * redis 访问密码
             */
            private String password;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getHost() {
                return host;
            }

            public void setHost(String host) {
                this.host = host;
            }

            public Integer getPort() {
                return port;
            }

            public void setPort(Integer port) {
                this.port = port;
            }

            public String getPassword() {
                return password;
            }

            public void setPassword(String password) {
                this.password = password;
            }
        }

        public static class IotDbProperties {
            /**
             * Whether the iotDB data store is enabled
             */
            private boolean enabled = false;

            /**
             * iotDB host
             */
            private String host = "127.0.0.1";

            /**
             * iotDB rpc port
             */
            private Integer rpcPort = 6667;

            /**
             * iotDB username
             */
            private String username;

            /**
             * iotDB password
             */
            private String password;

            /**
             * cluster node url list
             */
            private List<String> nodeUrls;

            private ZoneId zoneId;

            /**
             * the version of IotDb
             */
            private Version version;

            /**
             * query timeout(ms)
             */
            private long queryTimeoutInMs;

            /**
             * save data expire time(ms)，-1 means it never expires
             * 数据存储时间(单位：ms,-1代表永不过期)
             * 注：这里为什么使用String而不是Long？
             *    目前IoTDB的set ttl只支持毫秒作为单位，后面可能会添加其他单位，为了兼容后面所以使用String类型
             */
            private String expireTime;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
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

            public String getHost() {
                return host;
            }

            public void setHost(String host) {
                this.host = host;
            }

            public Integer getRpcPort() {
                return rpcPort;
            }

            public void setRpcPort(Integer rpcPort) {
                this.rpcPort = rpcPort;
            }

            public List<String> getNodeUrls() {
                return nodeUrls;
            }

            public void setNodeUrls(List<String> nodeUrls) {
                this.nodeUrls = nodeUrls;
            }

            public Version getVersion() {
                return version;
            }

            public void setVersion(Version version) {
                this.version = version;
            }

            public ZoneId getZoneId() {
                return zoneId;
            }

            public void setZoneId(ZoneId zoneId) {
                this.zoneId = zoneId;
            }

            public long getQueryTimeoutInMs() {
                return queryTimeoutInMs;
            }

            public void setQueryTimeoutInMs(long queryTimeoutInMs) {
                this.queryTimeoutInMs = queryTimeoutInMs;
            }

            public String getExpireTime() {
                return expireTime;
            }

            public void setExpireTime(String expireTime) {
                this.expireTime = expireTime;
            }
        }
    }

}
