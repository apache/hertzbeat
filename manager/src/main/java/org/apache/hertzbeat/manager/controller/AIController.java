package org.apache.hertzbeat.manager.controller;

import com.alibaba.fastjson.JSON;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.apache.hertzbeat.manager.service.AIService;
import org.apache.hertzbeat.manager.service.impl.AIServiceFactoryImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;

/**
 * AI Management API
 */
@Tag(name = "AI Manage API")
@RestController
@RequestMapping(value = "/api/ai")
public class AIController {

    @Autowired
    private AIServiceFactoryImpl aiServiceFactory;

    @Value("${aiConfig.type:0}")
    private String type;

    /**
     * request AI
     * @param param
     * @param currentlyDisabledType Currently disabled, later released
     * @return
     */
    @GetMapping(path = "/get", produces = {TEXT_EVENT_STREAM_VALUE})
    public Flux<ServerSentEvent<String>> requestAI(@RequestParam("param") String param,
                                                     @RequestParam(value = "type",required = false) String currentlyDisabledType) {
        AIService aiServiceImplBean = aiServiceFactory.getAIServiceImplBean(type);

        return aiServiceImplBean.requestAI(param);
    }
}
