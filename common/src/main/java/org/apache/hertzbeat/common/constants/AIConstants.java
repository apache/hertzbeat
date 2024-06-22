package org.apache.hertzbeat.common.constants;

import com.fasterxml.jackson.annotation.JsonProperty;

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
        String URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

        /**
         * request role param
         */
        String requestRole = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 1024
         */
         Integer maxTokens = 1024;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value, the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
         double temperature = 0.95;

    }
}
