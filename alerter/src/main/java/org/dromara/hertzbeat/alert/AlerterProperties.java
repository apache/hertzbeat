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
 * alerter prop config
 * @author tom
 */
@Component
@ConfigurationProperties(prefix = "alerter")
@Getter
@Setter
public class AlerterProperties {

    /**
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
     * Gotify Notify url
     */
    private String gotifyNotifyUrl = "https://push.example.de/message?token=";

    /**
     * Data entry configuration properties
     */
    private EntranceProperties entrance;

    /**
     * Data entry configuration properties
     */
    @Getter
    @Setter
    public static class EntranceProperties {

        /**
         * kafka configuration information
         */
        private KafkaProperties kafka;

        /**
         * kafka configuration information
         */
        @Getter
        @Setter
        public static class KafkaProperties {
            /**
             * Whether the kafka data entry is started
             */
            private boolean enabled = true;

            /**
             * kafka's connection server url
             */
            private String servers = "127.0.0.1:9092";
            /**
             * The name of the topic that receives the data
             */
            private String topic;
            /**
             * Consumer Group ID
             */
            private String groupId;

        }

    }


}
