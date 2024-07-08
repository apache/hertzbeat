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
import org.apache.hertzbeat.manager.service.AiService;
import org.apache.hertzbeat.manager.service.impl.AiServiceFactoryImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    @Autowired
    private AiServiceFactoryImpl aiServiceFactory;

    /**
     * Types of artificial intelligence
     */
    @Value("${ai.type:zhiPu}")
    private String type;

    /**
     * request AI
     * @param text                  request text
     * @param currentlyDisabledType Currently disabled, later released
     * @return                      AI response
     */
    @GetMapping(path = "/get", produces = {TEXT_EVENT_STREAM_VALUE})
    @Operation(summary = "Artificial intelligence questions and Answers",
            description = "Artificial intelligence questions and Answers")
    public Flux<String> requestAi(@Parameter(description = "Request text", example = "Who are you") @RequestParam("text") String text,
                                  @Parameter(description = "Types of artificial intelligence", example = "zhiPu") @RequestParam(value = "type", required = false) String currentlyDisabledType)  {

        AiService aiServiceImplBean = aiServiceFactory.getAiServiceImplBean(type);

        return aiServiceImplBean.requestAi(text);
    }
}
