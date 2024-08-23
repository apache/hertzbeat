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

package org.apache.hertzbeat.alert;

import lombok.Getter;
import lombok.Setter;
import org.apache.hertzbeat.common.config.BaseKafkaProperties;
import org.apache.hertzbeat.common.constants.ConfigConstants;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * alerter prop config
 */

@Getter
@Setter
@Component
@ConfigurationProperties(prefix =
        ConfigConstants.FunctionModuleConstants.ALERTER)
public class AlerterProperties {

    /**
     * Alarm content console link
     */
    private String consoleUrl = "https://console.tancloud.io";

    /**
     * WeWork webhook url
     */
    private String weWorkWebhookUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";

    /**
     * DingDing talk webhook url
     */
    private String dingTalkWebhookUrl = "https://oapi.dingtalk.com/robot/send?access_token=";

    /**
     * FlyBook webhook url
     */
    private String flyBookWebhookUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/";

    /**
     * Telegram Bot api url
     */
    private String telegramWebhookUrl = "https://api.telegram.org/bot%s/sendMessage";

    /**
     * Discord Notify url
     */
    private String discordWebhookUrl = "https://discord.com/api/v9/channels/%s/messages";

    /**
     * ServerChan Notify url
     */
    private String serverChanWebhookUrl = "https://sctapi.ftqq.com/%s.send";
    /**
     * Gotify Notify url
     */
    private String gotifyWebhookUrl = "https://push.example.de/message?token=";

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
        public static class KafkaProperties extends BaseKafkaProperties {

            /**
             * Whether the kafka data entry is started
             */
            private boolean enabled = true;
        }
    }

}
