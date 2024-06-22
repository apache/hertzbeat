package org.apache.hertzbeat.manager.service.impl;

import org.apache.hertzbeat.manager.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class AIServiceFactoryImpl {

    @Autowired
    private List<AIService> aiService;
    private Map<String,AIService> aiServiceFactoryMap = new HashMap<>();;

    @PostConstruct
    public void init() {
        aiServiceFactoryMap = aiService.stream()
                .collect(Collectors.toMap(AIService::getType, Function.identity()));
    }

    public AIService getAIServiceImplBean(String type) {
        Assert.notNull(type,"type is null");
        AIService aiServiceImpl = aiServiceFactoryMap.get(type);
        Assert.notNull(aiServiceImpl,"No bean for current type found");
        return aiServiceImpl;
    }

}
