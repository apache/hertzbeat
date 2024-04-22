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

import java.time.ZoneId;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

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

            public String getServers() {
                return servers;
            }

            public String getTopic() {
                return topic;
            }

            public String getGroupId() {
                return groupId;
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
         * @param enabled Whether memory data storage is enabled
         * @param initSize Memory storage map initialization size
         */
        public record MemoryProperties(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("1024") Integer initSize
        ){}

        /**
         * JPA configuration information
         * @param enabled use mysql/h2 jpa store metrics history data
         * @param expireTime save data expire time(ms)
         * @param maxHistoryRecordNum The maximum number of history records retained
         */
        public record JpaProperties(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("1h") String expireTime,
            @DefaultValue("20000") Integer maxHistoryRecordNum
        ) {}

        /**
         * Influxdb configuration information
         */
        public record InfluxdbProperties(
            @DefaultValue("false") boolean enabled,
            String serverUrl,
            String username,
            String password,
            @DefaultValue("30d") String expireTime,
            @DefaultValue("1") int replication) {}

        /**
         *
         * @param enabled Whether the TdEngine data store is enabled
         * @param url TdEngine connect url
         * @param driverClassName tdengine driver, default restful driver
         * @param username tdengine username
         * @param password  tdengine password
         * @param tableStrColumnDefineMaxLength auto create table's string column define max length : NCHAR(200)
         */
        public record TdEngineProperties(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("jdbc:TAOS-RS://localhost:6041/demo") String url,
            @DefaultValue("com.taosdata.jdbc.rs.RestfulDriver") String driverClassName,
            String username,
            String password,
            @DefaultValue("200") int tableStrColumnDefineMaxLength) {}

        /**
         * Victoriametrics configuration information
         */
        public record VictoriaMetricsProperties(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("http://localhost:8428") String url,
            String username,
            String password)
        {}

        /**
         * Redis configuration information
         */
        public record RedisProperties(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("127.0.0.1") String host,
            @DefaultValue("6379") Integer port,
            String password,
            @DefaultValue("0") Integer db) {}

        /**
         * IotDB configuration information
         * @param enabled Whether the iotDB data store is enabled
         * @param host iotDB host
         * @param expireTime save data expire time(ms)，-1 means it never expires Data storage time (unit: ms,-1 means never expire)
         *                   Note: Why is String used here instead of Long? At present, the set ttl of IoTDB only supports milliseconds as a unit,
         *                   and other units may be added later, so the String type is used for compatibility Data storage time (unit: ms, -1 means never expires)
         *
         *                   Note: Why use String instead of Long here? Currently, IoTDB's set ttl only supports milliseconds as the unit.
         *                   Other units may be added later. In order to be compatible with the future, the String type is used.
         */
        public record IotDbProperties(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("127.0.0.1") String host,
            @DefaultValue("6667") Integer rpcPort,
            String username,
            String password,
            List<String> nodeUrls,
            ZoneId zoneId,
            IotDbVersion version,
            long queryTimeoutInMs,
            String expireTime) {}

        /**
         * GrepTimeDB configuration information
         */
        public record GreptimeProperties(
            @DefaultValue("false") boolean enabled,
            @DefaultValue("127.0.0.1:4001") String endpoint,
            String username,
            String password) {}

    }

}
