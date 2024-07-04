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

package org.apache.hertzbeat.manager.service;

import com.alibaba.fastjson.JSON;
import java.util.List;
import java.util.Objects;
import javax.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.AiMessage;
import org.apache.hertzbeat.manager.pojo.dto.KimiAiRequestParamDTO;
import org.apache.hertzbeat.manager.pojo.dto.KimiAiResponse;
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
 * Kimi Ai
 */
@Service("KimiAiServiceImpl")
@Slf4j
public class KimiAiServiceImpl implements AiService {

    @Value("${aiConfig.model:moonshot-v1-8k}")
    private String model;

    @Value("${aiConfig.api-key}")
    private String apiKey;

    private WebClient webClient;

    @PostConstruct
    private void init() {
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.KimiAiConstants.URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(item -> item.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Override
    public AiTypeEnum getType() {
        return AiTypeEnum.kimiAi;
    }

    @Override
    public Flux<String> requestAi(String text) {

        checkParam(text, apiKey);
        KimiAiRequestParamDTO zhiPuRequestParamDTO = KimiAiRequestParamDTO.builder()
                .model(model)
                .stream(Boolean.TRUE)
                .maxTokens(AiConstants.KimiAiConstants.MAX_TOKENS)
                .temperature(AiConstants.KimiAiConstants.TEMPERATURE)
                .messages(List.of(new AiMessage(AiConstants.KimiAiConstants.REQUEST_ROLE, text)))
                .build();


        return webClient.post()
                .body(BodyInserters.fromValue(zhiPuRequestParamDTO))
                .retrieve()
                .bodyToFlux(String.class)
                .filter(aiResponse -> !"[DONE]".equals(aiResponse))
                .map(this::convertToResponse)
                .doOnError(error -> log.info("AiResponse Exception:{}", error.toString()));

    }

    private String convertToResponse(String aiRes) {
        try {
            KimiAiResponse kimiAiResponse = JSON.parseObject(aiRes, KimiAiResponse.class);
            if (Objects.nonNull(kimiAiResponse)) {
                KimiAiResponse.Choice choice = kimiAiResponse.getChoices().get(0);
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
