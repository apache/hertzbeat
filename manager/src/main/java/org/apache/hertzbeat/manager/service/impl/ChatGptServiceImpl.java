package org.apache.hertzbeat.manager.service.impl;

import com.alibaba.fastjson.JSON;
import org.apache.hertzbeat.common.constants.AIConstants;
import org.apache.hertzbeat.manager.pojo.dto.AIMessage;
import org.apache.hertzbeat.manager.pojo.dto.AIResponse;
import org.apache.hertzbeat.manager.pojo.dto.ChatGptRequestParamDTO;
import org.apache.hertzbeat.manager.service.AIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;

import org.springframework.stereotype.Component;
import org.springframework.util.Assert;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.util.List;

/**
 * chatgpt
 */
@Component("chatGptServiceImpl")
public class ChatGptServiceImpl implements AIService {

//    @Value("${openai.chatgpt.model}")
//    private String model;
//
//    @Value("${openai.chatgpt.api.key}")
//    private String apiKey;
//
//    @Value("${openai.chatgpt.max_completions:1}")
//    private int maxCompletions;
//
//    @Value("${openai.chatgpt.temperature:1}")
//    private double temperature;
//
//    @Value("${openai.chatgpt.max_tokens}")
//    private int maxTokens;
//
    @Resource
    private RestTemplate restTemplate;

    public static final String MODEL = "gpt-3.5-turbo";
    public static final String API_KEY = "无";
    public static final int MAX_COMPLETIONS = 1;
    public static final double TEMPERATURE = 1;
    public static final int MAX_TOKENS = 1000;



    @Override
    public int getType() {
        return 0;
    }

    @Override
    public AIResponse aiResponse(String param) {
        checkParam(param,MODEL,API_KEY);

        ChatGptRequestParamDTO chatGptRequestParamDTO = ChatGptRequestParamDTO.builder()
                .model(MODEL)
                .maxTokens(MAX_TOKENS)
                .maxCompletions(MAX_COMPLETIONS)
                .messages(List.of(new AIMessage("user", param)))
                .temperature(TEMPERATURE).build();


        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer " + API_KEY);
        System.out.println(JSON.toJSONString(chatGptRequestParamDTO));
        AIResponse aiResponse = restTemplate.postForObject(
                AIConstants.ChatgptConstants.url,
                new HttpEntity<>(chatGptRequestParamDTO, headers),
                AIResponse.class
        );

        return aiResponse;
    }

    /**
     * check param
     * @param param
     * @param model
     * @param apiKey
     */
    private void checkParam(String param, String model, String apiKey) {
        Assert.notNull(param,"param is null");
        Assert.notNull(model,"ai.yml openai.chatgpt.api.key is null");
        Assert.notNull(apiKey,"ai.yml openai.chatgpt.api.key is null");
    }

}
