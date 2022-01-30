package com.usthe.warehouse;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 数据仓储配置属性
 * @author tom
 * @date 2021/11/24 10:38
 */
@Component
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
             * TdEngine数据存储是否启动
             */
            private boolean enabled = true;
            /**
             * TdEngine的连接服务器url
             */
            private String url = "jdbc:TAOS-RS://localhost:6041/demo";
            /**
             * 驱动类路径
             */
            private String driverClassName = "com.taosdata.jdbc.rs.RestfulDriver";
            /**
             * 数据库用户名
             */
            private String username;
            /**
             * 数据库密码
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
        }

        public static class RedisProperties {
            /**
             * redis数据存储是否启动
             */
            private boolean enabled = true;
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
    }

}
