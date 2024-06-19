package org.apache.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * chatGpt Request param
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatGptRequestParamDTO {


    /**
     * ai version
     */
    private String model;

    /**
     * request message
     */
    private List<AIMessage> messages;

    /**
     * Number of message responses
     */
    private int maxCompletions = 1;

    /**
     * The default value is 1 and ranges from 0 to 1. This parameter regulates the randomness of the response.
     * Higher values increase randomness, while lower values increase focus and certainty
     */
    private double temperature = 1;

    /**
     * There is no limit by default,
     * but this parameter allows you to specify the maximum number of tokens to be generated in the response.
     */
    private Integer maxTokens;


}



