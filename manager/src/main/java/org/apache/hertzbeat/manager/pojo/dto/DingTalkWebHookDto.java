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
import lombok.Data;

/**
 * DingTalk robot request body
 * @version 1.0
 */
@Data
public class DingTalkWebHookDto {

    public static final String DEFAULT_MSG_TYPE = "markdown";

    /**
     * text format
     */
    public static final String TEXT_MSG_TYPE = "text";

    /**
     * Message type
     */
    @JsonProperty(value = "msgtype")
    private String msgType = DEFAULT_MSG_TYPE;

    /**
     * markdown message
     */
    private MarkdownDTO markdown;

    /**
     * @ UserId list
     */
    private AtDTO at;

    /**
     * text message
     */
    private TextDTO text;

    /**
     * Text dto.
     */
    @Data
    public static class TextDTO {

        /**
         * Message content.
         */
        private String content;

    }

    /**
     * markdown dto.
     */
    @Data
    public static class MarkdownDTO {

        /**
         * Message content
         */
        private String text;

        /**
         * Message title.
         */
        private String title;
    }

    /**
     * At dto.
     */
    @Data
    public static class AtDTO {

        /**
         * Message content
         */
        private Boolean isAtAll;

        /**
         * @ UserId list
         */
        private List<String> atUserIds;

        /**
         * @ Mobiles list
         */
        private List<String> atMobiles;

    }

}
