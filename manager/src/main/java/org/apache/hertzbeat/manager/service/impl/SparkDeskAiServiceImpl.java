package org.apache.hertzbeat.manager.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AiConstants;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.pojo.dto.AiMessage;
import org.apache.hertzbeat.manager.pojo.dto.SparkDeskRequestParamDTO;
import org.apache.hertzbeat.manager.pojo.dto.ZhiPuAiResponse;
import org.apache.hertzbeat.manager.pojo.dto.ZhiPuRequestParamDTO;
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
 * sparkDesk AI
 */
@Service("SparkDeskAiServiceImpl")
@Slf4j
public class SparkDeskAiServiceImpl implements AiService {

    @Value("${aiConfig.model:generalv3.5}")
    private String model;

    @Value("${aiConfig.api-key}")
    private String apiKey;

    private WebClient webClient;

    @PostConstruct
    private void init() {
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.SparkDeskConstants.URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey+":"+ "YjFkN2ZlYWY0OWVmODE1MDE0OGYwZmIz")
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
    public Flux<ServerSentEvent<String>> requestAi(String text) {
        System.out.println("???");
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

            System.out.println(JSON.toJSONString(zhiPuRequestParamDTO));
            webClient.post()
                    .body(BodyInserters.fromValue(zhiPuRequestParamDTO))
                    .retrieve()
                    .bodyToFlux(String.class)
                    .filter(aiResponse -> !"[DONE]".equals(aiResponse))
                    .map(this::convertToResponse)
                    .doOnNext(System.out::println)
                    .subscribe();
        } catch (Exception e) {
            System.out.println(e.toString());
        }

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
