package com.usthe.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 钉钉机器人请求消息体
 * @author 花城
 * @version 1.0
 * @date 2022/2/21 6:55 下午
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@SuppressWarnings("PMD")
public class DingTalkWebHookDto {

    public static final String WEBHOOK_URL = "https://oapi.dingtalk.com/robot/send?access_token=";
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
        private String text;
        /**
         * 消息标题
         */
        private String title;
    }

}
