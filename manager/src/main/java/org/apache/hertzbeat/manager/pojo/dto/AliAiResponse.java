package org.apache.hertzbeat.manager.pojo.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AliAiResponse
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AliAiResponse {


    /**
     * response message
     */
    private List<AliAiResponse.Choice> choices;

    /**
     * Returns the number of tokens invoked by the model at the end.
     */
    private AliAiResponse.Tokens usage;

    /**
     * Choice
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public class Choice {
        /**
         * Stop cause:
         * null: being generated
         * stop: stop token causes the end
         * length: indicates that the generation length ends
         */
        @JsonProperty("finish_reason")
        private String finishReason;
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
