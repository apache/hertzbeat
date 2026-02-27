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
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AliAiResponse
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AliAiResponse {

    /**
     * response
     */
    private AliAiOutput output;

    /**
     * Returns the number of tokens invoked by the model at the end.
     */
    private Tokens usage;

    /**
     * AliAiOutput
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AliAiOutput {

        /**
         * response message
         */
        private List<Choice> choices;

    }

    /**
     * Choice
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Choice {

        /**
         * Stop cause:
         * null: being generated
         * stop: stop token causes the end
         * length: indicates that the generation length ends
         */
        @JsonProperty("finish_reason")
        private String finishReason;

        /**
         * response message
         */
        private AiMessage message;
    }

    /**
     * Tokens
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public class Tokens {

        /**
         * The number of tokens of the model output content
         */
        @JsonProperty("output_tokens")
        private Integer outputTokens;

        /**
         * The number of tokens entered this request.
         * When enable_search is set to true, the number of tokens entered is greater than the number of
         * tokens you entered the request because you need to add search related content.
         */
        @JsonProperty("input_tokens")
        private Integer inputTokens;

        /**
         * usage.output_tokens and usage.input_tokens sum
         */
        @JsonProperty("total_tokens")
        private Integer totalTokens;
    }

}
