package com.usthe.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 企业微信机器人请求消息体
 *
 * @version 1.0
 *
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WeWorkWebHookDTO {

    public static final String WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=";
    private static final String MARKDOWN = "markdown";

    /**
     * 消息类型
     */
    private String msgtype = MARKDOWN;

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

}
