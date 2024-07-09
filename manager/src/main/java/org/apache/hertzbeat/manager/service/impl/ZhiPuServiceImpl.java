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


import java.util.List;
import javax.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.AiMessage;
import org.apache.hertzbeat.manager.pojo.dto.OpenAiRequestParamDTO;
import org.apache.hertzbeat.manager.pojo.dto.OpenAiResponse;
import org.apache.hertzbeat.manager.service.AiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;


/**
 * ZhiPu AI
 */
@Service("ZhiPuServiceImpl")
@ConditionalOnProperty(prefix = "ai", name = "api-key", matchIfMissing = false)
@Slf4j
public class ZhiPuServiceImpl implements AiService {
    @Value("${ai.model:glm-4}")
    private String model;
    @Value("${ai.api-key}")
    private String apiKey;

    private WebClient webClient;


    @PostConstruct
    private void init() {
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.ZhiPuConstants.URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(item -> item.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Override
    public AiTypeEnum getType() {
        return AiTypeEnum.zhiPu;
    }

    @Override
    public Flux<ServerSentEvent<String>> requestAi(String text) {
        try {
            checkParam(text, model, apiKey);
            OpenAiRequestParamDTO zhiPuRequestParamDTO = OpenAiRequestParamDTO.builder()
                    .model(model)
                    //sse
                    .stream(Boolean.TRUE)
                    .maxTokens(AiConstants.ZhiPuConstants.MAX_TOKENS)
                    .temperature(AiConstants.ZhiPuConstants.TEMPERATURE)
                    .messages(List.of(new AiMessage(AiConstants.ZhiPuConstants.REQUEST_ROLE, text)))
                    .build();

            return webClient.post()
                    .body(BodyInserters.fromValue(zhiPuRequestParamDTO))
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(aiResponse -> !"[DONE]".equals(aiResponse))
                    .map(OpenAiResponse::convertToResponse)
                    .doOnError(error -> log.info("AiResponse Exception:{}", error.toString()));

        } catch (Exception e) {
            log.info("ZhiPuServiceImpl.requestAi exception:{}", e.toString());
            throw e;
        }
    }

    private void checkParam(String param, String model, String apiKey) {
        Assert.notNull(param, "text is null");
        Assert.notNull(apiKey, "ai.api-key is null");
    }


}
