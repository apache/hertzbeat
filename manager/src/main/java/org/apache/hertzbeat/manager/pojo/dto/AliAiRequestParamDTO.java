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
 * Alibaba Ai Request param
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AliAiRequestParamDTO {

    /**
     * ai version
     */
    private String model;

    /**
     * Enter information about the model
     */
    private Input input;

    /**
     * Parameters used to control model generation
     */
    private Parameters parameters;

    /**
     * Input
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Input {

        /**
         * request message
         */
        private List<AiMessage> messages;

    }

    /**
     * Parameters
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Parameters {

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 1024
         */
        @JsonProperty("max_tokens")
        private Integer maxTokens;

        /**
         * Used to control the degree of randomness and variety. Specifically, the temperature value controls the
         * degree to which the probability distribution for each candidate word is smoothed when text is generated.
         * A higher temperature will reduce the peak value of the probability distribution, so that more low-probability
         * words will be selected and the results will be more diversified. A lower temperature will increase the peak of the probability distribution,
         * making it easier for high-probability words to be selected and producing more certain results.
         */
        private float temperature;

        /**
         * The Internet search service is built into the model, and this parameter controls whether the model refers
         * to the Internet search results when generating text. The value can be:
         * true: If Internet search is enabled, the model uses the search results as reference information in the text
         * generation process, but the model "decides" whether to use the Internet search results based on its internal logic.
         * false: Turn off Internet search.
         */
        @JsonProperty("enable_search")
        private boolean enableSearch;

        /**
         * Set return format,default message
         */
        @JsonProperty("result_format")
        private String resultFormat;

        /**
         * Control whether incremental output is enabled in stream output mode, that is, whether the subsequent output content contains
         * the output content. If the value is set to True, the incremental output mode will be enabled, and the subsequent output will
         * not contain the output content, you need to splice the overall output by yourself. Set to False to contain the output.
         */
        @JsonProperty("incremental_output")
        private boolean incrementalOutput;

    }



}
