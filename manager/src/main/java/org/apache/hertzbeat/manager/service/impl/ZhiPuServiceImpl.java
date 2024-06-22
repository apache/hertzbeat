package org.apache.hertzbeat.manager.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.AIConstants;
import org.apache.hertzbeat.manager.pojo.dto.AIMessage;
import org.apache.hertzbeat.manager.pojo.dto.ZhiPuAIResponse;
import org.apache.hertzbeat.manager.pojo.dto.zhiPuRequestParamDTO;
import org.apache.hertzbeat.manager.service.AIService;
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
 * 智普AI
 */
@Service("ZhiPuServiceImpl")
@Slf4j
public class ZhiPuServiceImpl implements AIService {
    @Value("${aiConfig.model:glm-4}")
    private String MODEL;
    @Value("${aiConfig.api-key}")
    private String API_KEY;

    private WebClient webClient;


    @PostConstruct
    private void init() {
        this.webClient = WebClient.builder()
                .baseUrl(AIConstants.ZhiPuConstants.URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + API_KEY)
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(item -> item.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                        .build())
                .build();
    }

    @Override
    public String getType() {
        return "0";
    }

    /**
     * request AI
     *
     * @param param
     * @return
     */
    @Override
    public Flux<ServerSentEvent<String>> requestAI(String param) {
        checkParam(param, MODEL, API_KEY);
        zhiPuRequestParamDTO chatGptRequestParamDTO = zhiPuRequestParamDTO.builder()
                .model(MODEL)
                //sse
                .stream(Boolean.TRUE)
                .maxTokens(AIConstants.ZhiPuConstants.maxTokens)
                .temperature(AIConstants.ZhiPuConstants.temperature)
                .messages(List.of(new AIMessage(AIConstants.ZhiPuConstants.requestRole, param)))
                .build();

        return webClient.post()
                .body(BodyInserters.fromValue(chatGptRequestParamDTO))
                .retrieve()
                .bodyToFlux(String.class)
                .filter(aiResponse -> !"[DONE]".equals(aiResponse))
                .map(this::convertToResponse);

    }

    private ServerSentEvent<String> convertToResponse(String aiRes) {
        try {
            ZhiPuAIResponse zhiPuAIResponse = JSON.parseObject(aiRes, ZhiPuAIResponse.class);
            if (Objects.nonNull(zhiPuAIResponse)) {
                ZhiPuAIResponse.Choice choice = zhiPuAIResponse.getChoices().get(0);
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

    /**
     * check param
     *
     * @param param
     * @param model
     * @param apiKey
     */
    private void checkParam(String param, String model, String apiKey) {
        Assert.notNull(param, "param is null");
        Assert.notNull(apiKey, "aiConfig.api-key is null");
    }


}
