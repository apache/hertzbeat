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

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeChat app dto.
 */

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeChatAppDTO {

    /**
     * markdown format
     */
    public static final String MARKDOWN = "markdown";

    @JsonProperty(value = "touser")
    private String toUser;

    @JsonProperty(value = "toparty")
    private String toParty;

    @JsonProperty(value = "totag")
    private String toTag;

    @JsonProperty(value = "msgtype")
    private String msgType;

    @JsonProperty(value = "agentid")
    private Integer agentId;

    /**
     * text message
     */
    private TextDTO text;

    /**
     * markdown message
     */
    private MarkdownDTO markdown;

    /**
     * WeChat markdown dto.
     */
    @Data
    public static class MarkdownDTO {

        /**
         * message content.
         */
        private String content;
    }

    /**
     * WeChat text dto.
     */
    @Data
    public static class TextDTO {

        /**
         * message content
         */
        private String content;
    }

}

