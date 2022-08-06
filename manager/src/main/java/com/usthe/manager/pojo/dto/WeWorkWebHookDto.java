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

package com.usthe.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 企业微信机器人请求消息体
 *
 * @author 花城
 * @version 1.0
 * @date 2022/2/21 6:55 下午
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeWorkWebHookDto {

    public static final String WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";
    /**
     * markdown格式
     */
    private static final String MARKDOWN = "markdown";
    /**
     * 文本格式
     */
    private static final String TEXT = "TEXT";

    /**
     * 消息类型
     */
    private String msgtype = MARKDOWN;

    /**
     * markdown消息
     */
    private MarkdownDTO markdown;

    @Data
    public static class MarkdownDTO {
        /**
         * 消息内容
         */
        private String content;
    }

}
