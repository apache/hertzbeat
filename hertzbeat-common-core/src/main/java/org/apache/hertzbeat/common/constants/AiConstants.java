/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.constants;

/**
 * AI constants
 */
public interface AiConstants {

    /**
     * zhiPu constants
     */
    interface ZhiPuConstants {

        /**
         * zhiPu request url
         */
        String URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;

    }

    /**
     * alibaba Ai constants
     */
    interface AliAiConstants {

        /**
         * alibabaAi request url
         */
        String URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;


    }

    /**
     * Kimi Ai constants
     */
    interface KimiAiConstants {

        /**
         * Kimi Ai URL
         */
        String URL = "https://api.moonshot.cn/v1/chat/completions";

        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;


    }

    /**
     * sparkDesk constants
     */
    interface SparkDeskConstants {
        /**
         * SparkDesk Ai URL
         */
        String SPARK_ULTRA_URL = "https://spark-api-open.xf-yun.com/v1/chat/completions";

        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;

    }
  
    /**
     * Ollama constants
     */
    interface OllamaConstants {
        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;

    }
  
    /**
     * OpenRouter constants
     */
    interface OpenRouterConstants {
        /**
         * OpenRouter Ai URL
         */
        String URL = "https://openrouter.ai/api/v1/chat/completions";
      
        /**
         * request role param
         */
        String REQUEST_ROLE = "user";

        /**
         * The model outputs the maximum tokens, with a maximum output of 8192 and a default value of 3072
         */
        Integer MAX_TOKENS = 3072;

        /**
         * The sampling temperature, which controls the randomness of the output, must be positive
         * The value ranges from 0.0 to 1.0, and cannot be equal to 0. The default value is 0.95. The larger the value,
         * the more random and creative the output will be. The smaller the value, the more stable or certain the output will be
         * You are advised to adjust top_p or temperature parameters based on application scenarios, but do not adjust the two parameters at the same time
         */
        float TEMPERATURE = 0.7f;

    }

}
