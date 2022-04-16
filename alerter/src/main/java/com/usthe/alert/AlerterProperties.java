package com.usthe.alert;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 数据仓储配置属性
 *
 * @author tom
 * @date 2021/11/24 10:38
 */
@Component
@ConfigurationProperties(prefix = "alerter")
public class AlerterProperties {

    private String consoleUrl = "https://console.tancloud.cn";

    public String getConsoleUrl() {
        return consoleUrl;
    }

    public void setConsoleUrl(String url) {
        this.consoleUrl = url;
    }

    /**
     * 数据入口配置属性
     */
    private EntranceProperties entrance;


    public EntranceProperties getEntrance() {
        return entrance;
    }

    public void setEntrance(EntranceProperties entrance) {
        this.entrance = entrance;
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


}
