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

package org.apache.hertzbeat.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.ZoneId;
import java.util.List;

/**
 * Data warehouse configuration properties
 */
@ConfigurationProperties(prefix = "warehouse")
public class WarehouseProperties {

    /**
     *  Data entry configuration properties
     */
    private EntranceProperties entrance;

    /**
     * Datastore configuration properties
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
     * Data entry configuration properties
     * The entrance can be to obtain data from message middleware such as kafka rabbitmq rocketmq
     */
    public static class EntranceProperties {

        /**
         * kafka configuration information
         */
        private KafkaProperties kafka;

        public KafkaProperties getKafka() {
            return kafka;
        }

        public void setKafka(KafkaProperties kafka) {
            this.kafka = kafka;
        }

        /**
         * kafka configuration information
         */
        public static class KafkaProperties {
            /**
             * Whether kafka data entry is started
             */
            private boolean enabled = true;

            /**
             * kafka connection server url
             */
            private String servers = "127.0.0.1:9092";
            /**
             * Topic name to receive data
             */
            private String topic;
            /**
             * Consumer group ID
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
     * Scheduling data export configuration properties
     */
    public static class StoreProperties {

        /**
         * use mysql/h2 jpa store metrics history data
         */
        private JpaProperties jpa;

        /**
         * Memory storage configuration information
         */
        private MemoryProperties memory;

        /**
         * influxdb configuration information
         */
        private InfluxdbProperties influxdb;
        /**
         * redis configuration information
         */
        private RedisProperties redis;
        /**
         * VictoriaMetrics Properties
         */
        private VictoriaMetricsProperties victoriaMetrics;
        /**
         * TdEngine configuration information
         */
        private TdEngineProperties tdEngine;
        /**
         * IoTDB configuration information
         */
        private IotDbProperties iotDb;
        /**
         * GrepTimeDB Config
         */
        private GreptimeProperties greptime;

        public JpaProperties getJpa() {
            return jpa;
        }

        public void setJpa(JpaProperties jpa) {
            this.jpa = jpa;
        }

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

        public VictoriaMetricsProperties getVictoriaMetrics() {
            return victoriaMetrics;
        }

        public void setVictoriaMetrics(VictoriaMetricsProperties victoriaMetrics) {
            this.victoriaMetrics = victoriaMetrics;
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

        public GreptimeProperties getGreptime() {
            return greptime;
        }

        public void setGreptime(GreptimeProperties greptime) {
            this.greptime = greptime;
        }

        /**
         * Memory storage configuration information
         */
        public static class MemoryProperties {
            /**
             * Whether memory data storage is enabled
             */
            private boolean enabled = true;
            /**
             * Memory storage map initialization size
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

        /**
         * JPA configuration information
         */
        public static class JpaProperties {
            /**
             * use mysql/h2 jpa store metrics history data
             */
            private boolean enabled = true;

            /**
             * save data expire time(ms)
             */
            private String expireTime = "1h";

            /**
             * The maximum number of history records retained
             */
            private Integer maxHistoryRecordNum = 20_000;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getExpireTime() {
                return expireTime;
            }

            public void setExpireTime(String expireTime) {
                this.expireTime = expireTime;
            }

            public Integer getMaxHistoryRecordNum() {
                return maxHistoryRecordNum;
            }

            public void setMaxHistoryRecordNum(Integer maxHistoryRecordNum) {
                this.maxHistoryRecordNum = maxHistoryRecordNum;
            }
        }

        /**
         * Influxdb configuration information
         */
        public static class InfluxdbProperties {
            /**
             * Is the influxdb data store started?
             */
            private boolean enabled = false;
            /**
             * Influxdb connection server url
             */
            private String serverUrl;
            /**
             * username
             */
            private String username;
            /**
             * password
             */
            private String password;
            /**
             * Expiration
             */
            private String expireTime = "30d";
            /**
             * Number of copies
             */
            private int replication = 1;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getServerUrl() {
                return serverUrl;
            }

            public void setServerUrl(String serverUrl) {
                this.serverUrl = serverUrl;
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

            public String getExpireTime() {
                return expireTime;
            }

            public void setExpireTime(String expireTime) {
                this.expireTime = expireTime;
            }
            
            public int getReplication() {
                return replication;
            }
            
            public void setReplication(int replication) {
                this.replication = replication;
            }
        }

        /**
         * TdEngine configuration information
         */
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

        /**
         * VictoriaMetrics Configuration information
         */
        public static class VictoriaMetricsProperties {
            /**
             * Whether the VictoriaMetrics data store is enabled
             */
            private boolean enabled = false;
            /**
             * VictoriaMetrics connect url
             */
            private String url = "http://localhost:8428";
            /**
             * VictoriaMetrics username
             */
            private String username;
            /**
             * VictoriaMetrics password
             */
            private String password;

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
            
        }

        /**
         * Redis Configuration information
         */
        public static class RedisProperties {
            /**
             * Whether the redis data store is started
             */
            private boolean enabled = false;
            /**
             * redis host
             */
            private String host = "127.0.0.1";
            /**
             * redis host port
             */
            private Integer port = 6379;
            /**
             * redis password
             */
            private String password;
            /**
             * redis uses the database, the default is DB0
             */
            private Integer db = 0;

            public Integer getDb() {
                return db;
            }

            public void setDb(Integer db) {
                this.db = db;
            }

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

        /**
         * IoTDB configuration information
         */
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
            private IotDbVersion version;

            /**
             * query timeout(ms)
             */
            private long queryTimeoutInMs;

            /**
             * save data expire time(ms)，-1 means it never expires
             * Data storage time (unit: ms,-1 means never expire)
             * Note: Why is String used here instead of Long?
             *    At present, the set ttl of IoTDB only supports milliseconds as a unit, and other units may be added later, so the String type is used for compatibility
             *
             * Data storage time (unit: ms, -1 means never expires)
             * Note: Why use String instead of Long here?
             *  Currently, IoTDB's set ttl only supports milliseconds as the unit. Other units
             *  may be added later. In order to be compatible with the future, the String type is used.
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

            public IotDbVersion getVersion() {
                return version;
            }

            public void setVersion(IotDbVersion version) {
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

        /**
         * GrepTimeDB configuration information
         */
        public static class GreptimeProperties {
            /**
             * Whether the GrepTimeDB data store is enabled
             */
            private boolean enabled = false;

            /**
             * GrepTimeDB endpoint
             */
            private String endpoint = "127.0.0.1:4001";

            /**
             * GrepTimeDB username
             */
            private String username;

            /**
             * GrepTimeDB password
             */
            private String password;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getEndpoint() {
                return endpoint;
            }

            public void setEndpoint(String endpoint) {
                this.endpoint = endpoint;
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
        }
    }

}
