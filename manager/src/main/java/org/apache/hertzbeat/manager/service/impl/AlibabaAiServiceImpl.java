package org.apache.hertzbeat.manager.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.*;
import org.apache.hertzbeat.manager.service.AiService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
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
 * alibaba Ai
 */
@Service("AlibabaAiServiceImpl")
@Slf4j
public class AlibabaAiServiceImpl implements AiService {

    @Value("${aiConfig.model:qwen-turbo}")
    private String model;
    @Value("${aiConfig.api-key}")
    private String apiKey;


    private WebClient webClient;

    @PostConstruct
    private void init() {
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.ZhiPuConstants.URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                //sse
                .defaultHeader(HttpHeaders.ACCEPT,MediaType.TEXT_EVENT_STREAM_VALUE)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(item -> item.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Override
    public AiTypeEnum getType() {
        return AiTypeEnum.alibabaAi;
    }

    @Override
    public Flux<ServerSentEvent<String>> requestAi(String text) {
        checkParam(text, apiKey);

        AliAiRequestParamDTO aliAiRequestParamDTO = AliAiRequestParamDTO.builder()
                .model(model)
                .input(AliAiRequestParamDTO.Input.builder()
                        .messages(List.of(new AiMessage(AiConstants.AliAiConstants.REQUEST_ROLE, text)))
                        .build())
                .parameters(AliAiRequestParamDTO.Parameters.builder()
                        .maxTokens(AiConstants.AliAiConstants.MAX_TOKENS)
                        .temperature(AiConstants.AliAiConstants.TEMPERATURE)
                        .enableSearch(true)
                        .resultFormat("message")
                        .build())
                .build();

        System.out.println(JSON.toJSONString(aliAiRequestParamDTO) + "apikey" + apiKey);
         webClient.post()
                .body(BodyInserters.fromValue(aliAiRequestParamDTO))
                .retrieve()
                .bodyToFlux(String.class)
                 .doOnNext(System.out::println) // 打印每个元素
                 .subscribe();

        return null;
    }


    private ServerSentEvent<String> convertToResponse(String aiRes) {
        try {
            ZhiPuAiResponse zhiPuAiResponse = JSON.parseObject(aiRes, ZhiPuAiResponse.class);
            if (Objects.nonNull(zhiPuAiResponse)) {
                ZhiPuAiResponse.Choice choice = zhiPuAiResponse.getChoices().get(0);
                String content = choice.getDelta().getContent();
                return ServerSentEvent.<String>builder()
                        .data(content)
                        .build();
            }
        } catch (Exception e) {
            log.info("convertToResponse Exception:{}", e.toString());
        }

        return ServerSentEvent.<String>builder().build();
    }
    private void checkParam(String param, String apiKey) {
        Assert.notNull(param, "text is null");
        Assert.notNull(apiKey, "aiConfig.api-key is null");
    }
}
