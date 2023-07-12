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

package org.dromara.hertzbeat.alert;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * alerter config
 *
 * @author tom
 *
 */
@Component
@ConfigurationProperties(prefix = "alerter")
@Getter
@Setter
public class AlerterProperties {

    /**
     * 告警内容控制台链接
     * Alarm content console link
     */
    private String consoleUrl = "https://console.tancloud.cn";

    /**
     * WeWork webhook url
     */
    private String weWorkWebHookUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";

    /**
     * DingDing talk webhook url
     */
    private String dingTalkWebHookUrl = "https://oapi.dingtalk.com/robot/send?access_token=";

    /**
     * FlyBook webhook url
     */
    private String flyBookWebHookUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/";

    /**
     * Telegram Bot api url
     */
    private String telegramBotApiUrl = "https://api.telegram.org/bot%s/sendMessage";

    /**
     * Discord Notify url
     */
    private String discordNotifyUrl = "https://discord.com/api/v9/channels/%s/messages";

    /**
     * ServerChan Notify url
     */
    private String serverChanNotifyUrl = "https://sctapi.ftqq.com/%s.send";

    /**
     * 告警评估时间间隔起始基数 每下一次乘2 单位毫秒
     * base of alert eval interval time, unit:ms. The next time is 2 times the previous time.
     */
    @Deprecated
    private long alertEvalIntervalBase = 1000 * 60 * 10L;

    /**
     * 最大告警评估时间间隔 单位毫秒
     * max of alert eval interval time, unit:ms
     */
    @Deprecated
    private long maxAlertEvalInterval = 1000 * 60 * 60 * 24L;

    /**
     * 系统内置告警(available alert, reachable alert...)触发次数
     * system alert(available alert, reachable alert...) trigger times
     */
    @Deprecated
    private int systemAlertTriggerTimes = 1;

    /**
     * Data entry configuration properties 数据入口配置属性
     */
    private EntranceProperties entrance;

    /**
     * Data entry configuration properties 数据入口配置属性
     * The entry can obtain data from messaging middleware such as kafka rabbitmq rocketmq 入口可以是从kafka rabbitmq rocketmq等消息中间件获取数据
     */
    @Getter
    @Setter
    public static class EntranceProperties {

        /**
         * kafka configuration information kafka配置信息
         */
        private KafkaProperties kafka;

        @Getter
        @Setter
        public static class KafkaProperties {
            /**
             * Whether the kafka data entry is started kafka数据入口是否启动
             */
            private boolean enabled = true;

            /**
             * kafka's connection server url kafka的连接服务器url
             */
            private String servers = "127.0.0.1:9092";
            /**
             * The name of the topic that receives the data 接收数据的topic名称
             */
            private String topic;
            /**
             * Consumer Group ID 消费者组ID
             */
            private String groupId;

        }

    }


}
