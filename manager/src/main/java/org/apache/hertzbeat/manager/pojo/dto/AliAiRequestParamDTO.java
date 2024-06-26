package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
         * The Internet search service is built into the model, and this parameter controls whether the model refers to the Internet search results when generating text. The value can be:
         * true: If Internet search is enabled, the model uses the search results as reference information in the text generation process, but the model "decides" whether to use the Internet search results based on its internal logic.
         * false: Turn off Internet search.
         */
        @JsonProperty("enable_search")
        private boolean enableSearch;

        /**
         * Set return format,default message
         */
        @JsonProperty("result_format")
        private String resultFormat;

    }



}
