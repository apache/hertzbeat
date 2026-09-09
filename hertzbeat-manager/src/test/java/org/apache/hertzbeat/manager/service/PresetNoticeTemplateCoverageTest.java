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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.withSettings;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.alert.notice.AlertNotifyHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.stereotype.Component;

/**
 * Test case for the preset notice template resources shipped in this module.
 * The templates live here while the loader and the notify handlers live in the alerter module,
 * so this is the only place where both sides are on the same classpath.
 */
class PresetNoticeTemplateCoverageTest {

    /**
     * Same location and suffixes that NoticeConfigServiceImpl scans on startup.
     */
    private static final String TEMPLATE_LOCATION = "classpath:templates/*.*";

    private static final String HANDLER_PACKAGE = "org.apache.hertzbeat.alert.notice.impl";

    /**
     * Sms notifications render their own message, so AlertNoticeDispatch skips the template lookup for them.
     */
    private static final byte SMS_TYPE = 0;

    @Test
    void everyRegisteredNotifyHandlerHasPresetTemplate() throws IOException {
        Set<Byte> presetTypes = loadPresetTemplateTypes();
        Map<Byte, String> registeredHandlers = loadRegisteredHandlers();

        assertFalse(registeredHandlers.isEmpty(), "No notify handler was discovered, the scan is broken");

        List<String> missing = new ArrayList<>();
        registeredHandlers.forEach((type, handlerName) -> {
            if (type != SMS_TYPE && !presetTypes.contains(type)) {
                missing.add(handlerName + "(type=" + type + ")");
            }
        });

        // AlertNoticeDispatch throws a NullPointerException and drops the notice when a receiver
        // is not bound to a template and the handler type has no preset template to fall back on.
        assertTrue(missing.isEmpty(),
                "Notify handlers without a preset notice template in resources/templates: " + missing);
    }

    private Set<Byte> loadPresetTemplateTypes() throws IOException {
        Set<Byte> types = new HashSet<>(16);
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources(TEMPLATE_LOCATION);
        for (Resource resource : resources) {
            String filename = resource.getFilename();
            if (filename == null || (!filename.endsWith("txt") && !filename.endsWith("html"))) {
                continue;
            }
            String[] names = filename.replace(".txt", "").replace(".html", "").split("-");
            if (names.length != 2) {
                continue;
            }
            types.add(Byte.parseByte(names[0]));
        }
        return types;
    }

    private Map<Byte, String> loadRegisteredHandlers() {
        Map<Byte, String> handlers = new HashMap<>(16);
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(AlertNotifyHandler.class));
        for (BeanDefinition definition : scanner.findCandidateComponents(HANDLER_PACKAGE)) {
            Class<?> handlerClass;
            try {
                handlerClass = Class.forName(definition.getBeanClassName());
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException(e);
            }
            // Only handlers that Spring actually registers reach AlertNoticeDispatch
            if (!handlerClass.isAnnotationPresent(Component.class)) {
                continue;
            }
            // type() returns a constant, so a mock calling real methods reports it without wiring the dependencies
            AlertNotifyHandler handler = (AlertNotifyHandler) mock(handlerClass,
                    withSettings().defaultAnswer(CALLS_REAL_METHODS));
            handlers.put(handler.type(), handlerClass.getSimpleName());
        }
        return handlers;
    }
}
