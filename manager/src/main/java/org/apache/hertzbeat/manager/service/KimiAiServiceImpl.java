package org.apache.hertzbeat.manager.service;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Objects;

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
        System.out.println(model);
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
                //sse
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
