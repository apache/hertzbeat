package com.usthe.common.entity.dto;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * @author 花城
 * @version 1.0
 * @date 2022/2/21 6:55 下午
 * @Description
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "企业微信WebHook模版")
public class WeChatWebHookDTO {
    /**
     * 消息类型
     */
    private String msgtype;

    private TextDTO text;

    private MarkdownDTO markdown;

    @Data
    public static class TextDTO{
        /**
         * 消息内容
         */
        private String content;

        /**
         * @人的名称英文拼写列表
         */
        private List<String> mentioned_list;

    }

    @Data
    public static class MarkdownDTO{
        /**
         * 消息内容
         */
        private String content;
    }

}
