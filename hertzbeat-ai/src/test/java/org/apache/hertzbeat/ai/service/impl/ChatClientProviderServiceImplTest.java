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

package org.apache.hertzbeat.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.ai.config.McpContextHolder;
import org.apache.hertzbeat.ai.config.SecurityContextToolCallback;
import org.apache.hertzbeat.ai.pojo.dto.ChatRequestContext;
import org.apache.hertzbeat.ai.sop.registry.SkillRegistry;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.context.ApplicationContext;
import org.springframework.context.support.StaticApplicationContext;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Flux;

/**
 * Verifies that the provider configuration cache reacts to enable and disable events.
 */
class ChatClientProviderServiceImplTest {

    @Test
    void configurationChangeShouldRefreshConfiguredState() {
        AtomicReference<GeneralConfig> currentConfig = new AtomicReference<>();
        GeneralConfigDao configDao = configDao(currentConfig);
        ChatClientProviderServiceImpl service = new ChatClientProviderServiceImpl(null, configDao, null);

        assertFalse(service.isConfigured());

        currentConfig.set(providerConfig("sk-test"));
        service.onAiProviderConfigChange(changeEvent());
        assertTrue(service.isConfigured());

        currentConfig.set(providerConfig(" "));
        service.onAiProviderConfigChange(changeEvent());
        assertFalse(service.isConfigured());
    }

    @Test
    @SuppressWarnings("unchecked")
    void streamChatShouldAttachSubjectAndWrapEveryToolCallback() {
        ApplicationContext applicationContext = mock(ApplicationContext.class);
        SkillRegistry skillRegistry = mock(SkillRegistry.class);
        ChatClient chatClient = mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec streamSpec = mock(ChatClient.StreamResponseSpec.class);
        ToolCallback delegate = mock(ToolCallback.class);
        SubjectSum subject = mock(SubjectSum.class);
        ChatClientProviderServiceImpl service = new ChatClientProviderServiceImpl(
                applicationContext, configDao(new AtomicReference<>()), skillRegistry);

        when(applicationContext.getBean("openAiChatClient", ChatClient.class)).thenReturn(chatClient);
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.messages(anyList())).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.tools(any(Object[].class))).thenReturn(requestSpec);
        when(requestSpec.toolContext(anyMap())).thenReturn(requestSpec);
        when(requestSpec.stream()).thenReturn(streamSpec);
        when(streamSpec.content()).thenReturn(Flux.just("answer"));
        when(skillRegistry.getAllSkills()).thenReturn(java.util.List.of());
        ReflectionTestUtils.setField(service, "systemResource", new ByteArrayResource(
                "skills={dynamically_injected_skills_list}; conversation={current_conversation_id}"
                        .getBytes(StandardCharsets.UTF_8)));
        ReflectionTestUtils.setField(service, "toolCallbackProvider", ToolCallbackProvider.from(delegate));

        ChatRequestContext context = ChatRequestContext.builder()
                .message("question")
                .conversationId(42L)
                .subject(subject)
                .build();
        service.streamChat(context).collectList().block();

        ArgumentCaptor<Object[]> callbacksCaptor = ArgumentCaptor.forClass(Object[].class);
        ArgumentCaptor<Map<String, Object>> contextCaptor = ArgumentCaptor.forClass(Map.class);
        verify(requestSpec).tools(callbacksCaptor.capture());
        verify(requestSpec).toolContext(contextCaptor.capture());
        assertInstanceOf(SecurityContextToolCallback.class, callbacksCaptor.getValue()[0]);
        assertSame(subject, McpContextHolder.getSubject(new org.springframework.ai.chat.model.ToolContext(
                contextCaptor.getValue())));
    }

    private GeneralConfigDao configDao(AtomicReference<GeneralConfig> currentConfig) {
        return (GeneralConfigDao) Proxy.newProxyInstance(
                GeneralConfigDao.class.getClassLoader(),
                new Class<?>[]{GeneralConfigDao.class},
                (proxy, method, args) -> "findByType".equals(method.getName()) ? currentConfig.get() : null);
    }

    private GeneralConfig providerConfig(String apiKey) {
        ModelProviderConfig modelConfig = new ModelProviderConfig();
        modelConfig.setApiKey(apiKey);
        return GeneralConfig.builder()
                .type("provider")
                .content(JsonUtil.toJson(modelConfig))
                .build();
    }

    private AiProviderConfigChangeEvent changeEvent() {
        return new AiProviderConfigChangeEvent(new StaticApplicationContext());
    }
}
