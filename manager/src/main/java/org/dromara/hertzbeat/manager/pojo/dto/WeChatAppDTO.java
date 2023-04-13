package org.dromara.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WeChatAppDTO
 * @author hdd
 * @create 2023/04/05
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeChatAppDTO {

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


    private TextDTO text;


    @Data
    public static class TextDTO {
        /**
         * 消息内容
         */
        private String content;
    }

}
