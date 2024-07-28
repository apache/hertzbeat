package org.apache.hertzbeat.manager.pojo.dto;

import lombok.Data;

/**
 * ServerChan WebHook DTO.
 */

@Data
public class ServerChanWebHookDto {
    private static final String MARKDOWN = "markdown";

    /**
     * title
     */
    private String title;

    /**
     * markdown message content
     */
    private String desp;

}
