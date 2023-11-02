package org.dromara.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeChatAppDTO
 * @author hdd
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeChatAppDTO {

    /**
     * markdown格式
     */
    public static final String MARKDOWN = "markdown";

    @JsonProperty(value = "touser")
    private String toUser;

    @JsonProperty(value = "toparty")
    private String toParty;

    @JsonProperty(value = "totag")
    private String toTag;

    @JsonProperty(value = "msgtype")
    private String msgType;

    @JsonProperty(value = "agentid")
    private Integer agentId;

    /**
     * text message
     */
    private TextDTO text;

    /**
     * markdown消息
     */
    private MarkdownDTO markdown;

    @Data
    public static class MarkdownDTO {
        /**
         * 消息内容
         */
        private String content;
    }

    @Data
    public static class TextDTO {
        /**
         * 消息内容
         */
        private String content;
    }

}