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
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeWork WebHook DTO
 */

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeWorkWebHookDto {

    public static final String WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";

    /**
     * default msg type : markdown format
     */
    public static final String DEFAULT_MSG_TYPE = "markdown";

    /**
     * text format
     */
    public static final String TEXT_MSG_TYPE = "text";

    /**
     * message type
     */
    @Builder.Default
    private String msgtype = DEFAULT_MSG_TYPE;

    /**
     * markdown message
     */
    private MarkdownDTO markdown;

    /**
     * text message
     */
    private TextDTO text;

    /**
     * MarkdownDTO
     */
    @Data
    public static class MarkdownDTO {

        /**
         * message content.
         */
        private String content;
    }

    /**
     * TextDTO.
     */
    @Data
    public static class TextDTO {

        /**
         * message content
         */
        private String content;
        /**
         * @ userId
         */
        @JsonProperty(value = "mentioned_list")
        private List<String> mentionedList;
        /**
         * @ phone
         */
        @JsonProperty(value = "mentioned_mobile_list")
        private List<String> mentionedMobileList;
    }

}
