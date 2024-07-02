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
    @Value("${aiConfig.api-secret}")
    private String apiSecret;

    private WebClient webClient;

    @PostConstruct
    private void init() {
        StringBuilder sb = new StringBuilder();
        String bearer = sb.append("Bearer ").append(apiKey).append(":").append(apiSecret).toString();
        this.webClient = WebClient.builder()
                .baseUrl(AiConstants.SparkDeskConstants.URL)
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
           log.info("SparkDeskAiServiceImpl.requestAi exception:{}",e.toString());
           throw e;
        }

    }

    private String convertToResponse(String aiRes) {
        try {
            ZhiPuAiResponse zhiPuAiResponse = JSON.parseObject(aiRes, ZhiPuAiResponse.class);
            if (Objects.nonNull(zhiPuAiResponse)) {
                ZhiPuAiResponse.Choice choice = zhiPuAiResponse.getChoices().get(0);
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
