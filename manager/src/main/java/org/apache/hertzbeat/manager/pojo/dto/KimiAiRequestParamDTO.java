package org.apache.hertzbeat.manager.pojo.dto;


import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * zhiPu Request param
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class KimiAiRequestParamDTO {

    /**
     * ai version
     */
    private String model;

    /**
     * request message
     */
    private List<AiMessage> messages;

    /**
     * The sampling temperature, which controls the randomness of the output, must be positive
     * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95.
     * The larger the value, the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
     * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
     */
    private float temperature;

    /**
     * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 1024
     */
    @JsonProperty("max_tokens")
    private Integer maxTokens;

    /**
     * stream response
     */
    private Boolean stream = Boolean.FALSE;


}



