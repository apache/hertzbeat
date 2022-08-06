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

import java.util.List;

/**
 * 飞书机器人消息实体
 *
 * @author 花城
 * @version 1.0
 * @date 2022/2/22 6:41 下午
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@SuppressWarnings("PMD")
public class FlyBookWebHookDto {

    public static final String WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/";

    private static final String MARKDOWN = "post";

    /**
     * 消息类型
     */
    private String msg_type = MARKDOWN;

    private Content content;

    /**
     * 消息内容
     */
    @Data
    public static class Content {
        public Post post;
    }

    @Data
    public static class FlyBookContent{
        /**
         * 格式  目前支持文本、超链接、@人的功能  text  a  at
         */
        public String tag;
        /**
         * 文本
         */
        public String text;
        /**
         * 超链接地址
         */
        public String href;

        public String user_id;
        public String user_name;
    }
    @Data
    public static class Post {
        public zh_cn zh_cn;
    }
    @Data
    public static class zh_cn{
        /**
         * 标题
         */
        public String title;
        /**
         * 内容
         */
        public List<List<FlyBookContent>> content;
    }

}
