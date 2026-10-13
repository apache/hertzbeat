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

package org.apache.hertzbeat.ai.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Metrics;
import io.micrometer.observation.ObservationRegistry;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.base.dao.GeneralConfigDao;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.common.support.event.AiProviderConfigChangeEvent;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/** Configuration class for Large Language Model (LLM) settings. */
@Configuration
@Slf4j
public class LlmConfig {

    static final String OPEN_AI_CHAT_CLIENT_BEAN_NAME = "openAiChatClient";

    private final GeneralConfigDao generalConfigDao;

    private final ObservationRegistry observationRegistry;

    private final MeterRegistry meterRegistry;

    private ApplicationContext applicationContext;

    @Autowired
    public LlmConfig(GeneralConfigDao generalConfigDao, ApplicationContext applicationContext,
                     ObjectProvider<ObservationRegistry> observationRegistryProvider,
                     ObjectProvider<MeterRegistry> meterRegistryProvider) {
        this(generalConfigDao, applicationContext,
                observationRegistryProvider.getIfAvailable(() -> ObservationRegistry.NOOP),
                meterRegistryProvider.getIfAvailable(() -> Metrics.globalRegistry));
    }

    private LlmConfig(GeneralConfigDao generalConfigDao, ApplicationContext applicationContext,
                      ObservationRegistry observationRegistry, MeterRegistry meterRegistry) {
        this.generalConfigDao = generalConfigDao;
        this.applicationContext = applicationContext;
        this.observationRegistry = observationRegistry;
        this.meterRegistry = meterRegistry;
    }

    LlmConfig(GeneralConfigDao generalConfigDao, ApplicationContext applicationContext) {
        this(generalConfigDao, applicationContext, ObservationRegistry.NOOP, Metrics.globalRegistry);
    }

    void registerInitialChatClient() {
        registerChatClient();
    }

    public ChatClient openAiChatClient() {
        return createChatClient();
    }

    /** Create ChatClient with all necessary components */
    private ChatClient createChatClient() {
        try {
            return createConfiguredChatClient();
        } catch (RuntimeException | LinkageError e) {
            log.warn("LLM provider configuration cannot create ChatClient; client disabled");
            return null;
        }
    }

    @Autowired(required = false)
    private org.apache.hertzbeat.ai.provider.EffectiveModelProviderResolver effectiveResolver;

    private ChatClient createConfiguredChatClient() {
        var resolver =
                effectiveResolver == null
                        // Tests and partial contexts construct LlmConfig without the provider
                        // module's resolver bean. This fallback reads the same store directly, so
                        // it has to name the manager implementation; the resolver bean itself no
                        // longer depends on the manager module.
                        ? new org.apache.hertzbeat.ai.provider.EffectiveModelProviderResolver(
                                new org.apache.hertzbeat.manager.service.impl
                                        .ModelProviderConfigServiceImpl(generalConfigDao),
                                applicationContext.getEnvironment())
                        : effectiveResolver;
        ModelProviderConfig config = resolver.resolve();
        if (config == null) {
            return null;
        }
        return ChatClient.create(
                new org.apache.hertzbeat.ai.provider.ProtocolChatModelFactory()
                        .create(config, true));
    }

    /**
     * AI configuration change event listener Uses ApplicationContext to unregister and re-register
     * the ChatClient bean
     */
    @EventListener(AiProviderConfigChangeEvent.class)
    public void onAiProviderConfigChange(AiProviderConfigChangeEvent event) {
        log.info("Provider configuration change event received, refreshing ChatClient bean");

        registerChatClient();
    }

    private void registerChatClient() {
        try {
            ConfigurableApplicationContext configurableContext = (ConfigurableApplicationContext) applicationContext;
            DefaultListableBeanFactory beanFactory = (DefaultListableBeanFactory) configurableContext.getBeanFactory();

            // Remove the existing ChatClient bean
            if (beanFactory.containsSingleton(OPEN_AI_CHAT_CLIENT_BEAN_NAME)) {
                beanFactory.destroySingleton(OPEN_AI_CHAT_CLIENT_BEAN_NAME);
                log.info("Existing ChatClient bean destroyed");
            }

            // Create new ChatClient with updated configuration
            ChatClient newChatClient = createChatClient();
            if (newChatClient == null) {
                log.info(
                        "ChatClient bean refresh skipped because AI provider configuration is"
                            + " incomplete");
                return;
            }

            // Register the new ChatClient bean
            beanFactory.registerSingleton(OPEN_AI_CHAT_CLIENT_BEAN_NAME, newChatClient);

            log.info("ChatClient bean refreshed successfully with new AI provider configuration");

        } catch (Exception e) {
            log.error("Failed to refresh ChatClient bean after configuration change", e);
        }
    }

}
