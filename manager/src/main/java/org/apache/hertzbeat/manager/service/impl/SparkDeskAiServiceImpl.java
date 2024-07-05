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

package org.apache.hertzbeat.manager.service.impl;

import com.alibaba.fastjson.JSON;
import java.util.List;
import java.util.Objects;
import javax.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.AiMessage;
import org.apache.hertzbeat.manager.pojo.dto.SparkDeskRequestParamDTO;
import org.apache.hertzbeat.manager.pojo.dto.SparkDeskResponse;
import org.apache.hertzbeat.manager.service.AiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;


/**
 * sparkDesk AI
 */
@Service("SparkDeskAiServiceImpl")
@Slf4j
public class SparkDeskAiServiceImpl implements AiService {

    @Value("${aiConfig.model:generalv3.5}")
    private String model;

    @Value("${aiConfig.api-key}")
    private String apiKey;
    @Value("${aiConfig.api-secret}")
    private String apiSecret;

    private WebClient webClient;

    @PostConstruct
    private void init() {
        StringBuilder sb = new StringBuilder();
        String bearer = sb.append("Bearer ").append(apiKey).append(":").append(apiSecret).toString();
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.SparkDeskConstants.SPARK_ULTRA_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, bearer)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(item -> item.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Override
    public AiTypeEnum getType() {
        return AiTypeEnum.sparkDesk;
    }

    @Override
    public Flux<String> requestAi(String text) {

        try {
            checkParam(text, apiKey);
            SparkDeskRequestParamDTO zhiPuRequestParamDTO = SparkDeskRequestParamDTO.builder()
                    .model(model)
                    //sse
                    .stream(Boolean.TRUE)
                    .maxTokens(AiConstants.SparkDeskConstants.MAX_TOKENS)
                    .temperature(AiConstants.SparkDeskConstants.TEMPERATURE)
                    .messages(List.of(new AiMessage(AiConstants.SparkDeskConstants.REQUEST_ROLE, text)))
                    .build();

            return webClient.post()
                    .body(BodyInserters.fromValue(zhiPuRequestParamDTO))
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(aiResponse -> !"[DONE]".equals(aiResponse))
                    .map(this::convertToResponse);
        } catch (Exception e) {
            log.info("SparkDeskAiServiceImpl.requestAi exception:{}", e.toString());
            throw e;
        }
    }

    private String convertToResponse(String aiRes) {
        try {
            SparkDeskResponse sparkDeskResponse = JSON.parseObject(aiRes, SparkDeskResponse.class);
            if (Objects.nonNull(sparkDeskResponse)) {
                SparkDeskResponse.Choice choice = sparkDeskResponse.getChoices().get(0);
                return choice.getDelta().getContent();
            }
        } catch (Exception e) {
            log.info("convertToResponse Exception:{}", e.toString());
        }

        return "";
    }


    private void checkParam(String param, String apiKey) {
        Assert.notNull(param, "text is null");
        Assert.notNull(apiKey, "aiConfig.api-key is null");
    }
}
