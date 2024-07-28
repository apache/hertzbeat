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

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Builder;
import lombok.Data;

/**
 * Discord DTO Object.
 */

public class DiscordDTO {

    /**
     * Discord notify DTO.
     */
    @Data
    @Builder
    public static class DiscordNotifyDTO {
        private List<EmbedDTO> embeds;
    }

    /**
     * Discord embed DTO.
     */
    @Data
    @Builder
    public static class EmbedDTO {
        private String title;
        private String description;
    }

    /**
     * Discord response DTO.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DiscordResponseDTO {
        private String id;
        private Integer type;
        private String content;
        private String message;
        private Integer code;
    }

}
