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

package org.apache.hertzbeat.manager.service.ai.factory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import org.apache.hertzbeat.common.constants.AiTypeEnum;
import org.apache.hertzbeat.manager.service.ai.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;
import org.springframework.util.CollectionUtils;

/**
 * AI bean factory
 */
@Component
@ConditionalOnProperty(prefix = "ai", name = "type")
public class AiServiceFactoryImpl {

    @Autowired(required = false)
    private List<AiService> aiService;

    private Map<AiTypeEnum, AiService> aiServiceFactoryMap = new HashMap<>();

    @PostConstruct
    public void init() {
        if (CollectionUtils.isEmpty(aiService)) {
            return;
        }
        aiServiceFactoryMap = aiService.stream()
                .collect(Collectors.toMap(AiService::getType, Function.identity()));
    }

    public AiService getAiServiceImplBean(String type) {
        Assert.notNull(type, "type is null");
        AiTypeEnum typeByName = AiTypeEnum.getTypeByName(type);
        Assert.notNull(typeByName, "The current type is not supported,please check that your type value is consistent with the documentation on the website");
        AiService aiServiceImpl = aiServiceFactoryMap.get(typeByName);
        Assert.notNull(aiServiceImpl, "No bean for current type found");
        return aiServiceImpl;
    }

}
