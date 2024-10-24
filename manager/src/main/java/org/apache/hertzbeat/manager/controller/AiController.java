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

package org.apache.hertzbeat.manager.controller;

import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.manager.config.AiProperties;
import org.apache.hertzbeat.manager.pojo.dto.AiControllerRequestParam;
import org.apache.hertzbeat.manager.service.ai.AiService;
import org.apache.hertzbeat.manager.service.ai.factory.AiServiceFactoryImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.util.Assert;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * AI Management API
 */
@Tag(name = "AI Manage API")
@RestController
@RequestMapping(value = "/api/ai")
public class AiController {

    /**
     * AI beanFactory
     */
    @Autowired(required = false)
    private AiServiceFactoryImpl aiServiceFactory;

    @Autowired
    private AiProperties aiProperties;

    /**
     * request AI
     * @param requestParam          request text
     * @return                      AI response
     */
    @PostMapping(path = "/get", produces = {TEXT_EVENT_STREAM_VALUE})
    @Operation(summary = "Artificial intelligence questions and Answers",
            description = "Artificial intelligence questions and Answers")
    public Flux<ServerSentEvent<String>> requestAi(@Parameter(description = "Request text", example = "Who are you")
                                                       @RequestBody AiControllerRequestParam requestParam)  {
        Assert.notNull(aiServiceFactory, "please check that your type value is consistent with the documentation on the website");
        AiService aiServiceImplBean = aiServiceFactory.getAiServiceImplBean(aiProperties.getType());
        return aiServiceImplBean.requestAi(requestParam.getText());
    }
}
