package org.apache.hertzbeat.common.constants;

/**
 * AI constants
 */
public interface AIConstants {

    /**
     * chatgpt constants
     */
    interface ZhiPuConstants {

        /**
         * zhiPu request url
         */
        String URL="https://open.bigmodel.cn/api/paas/v4/chat/completions";

        /**
         * request role param
         */
        String requestRole = "user";

    }
}
