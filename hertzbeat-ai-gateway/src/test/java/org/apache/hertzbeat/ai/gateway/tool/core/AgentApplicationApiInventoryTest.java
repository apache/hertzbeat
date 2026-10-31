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

package org.apache.hertzbeat.ai.gateway.tool.core;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;
import org.springframework.ai.util.json.schema.JsonSchemaGenerator;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Service;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Metadata-only inventory: no controller, domain handler, model or application database is invoked.
 */
class AgentApplicationApiInventoryTest {
    @Test
    void exportsActualToolSchemasAndNativeRouteContracts() throws Exception {
        Path output =
                Path.of(
                        System.getProperty(
                                "hertzbeat.coverage.output", "target/application-api-coverage"));
        Files.createDirectories(output);
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Service.class));
        try (var context = new GenericApplicationContext()) {
            for (var candidate :
                    scanner.findCandidateComponents("org.apache.hertzbeat.ai.gateway.tool")) {
                register(
                        context,
                        ClassUtils.forName(
                                candidate.getBeanClassName(), getClass().getClassLoader()));
            }
            context.refresh();
            var registry =
                    new AgentToolConfiguration()
                            .agentToolRegistry(context.getDefaultListableBeanFactory());
            var descriptors = registry.descriptors();
            assertTrue(descriptors.size() >= 252);
            for (var descriptor : descriptors) {
                assertFalse(descriptor.getInputSchema().isBlank(), descriptor.getName());
                assertTrue(
                        descriptor.getInputSchema().contains("properties"), descriptor.getName());
            }
            Files.writeString(
                    output.resolve("registered-tool-schemas.json"), JsonUtil.toJson(descriptors));
            var readContract =
                    Class.forName(
                                    "org.apache.hertzbeat.ai.gateway.runtime.AgentReadContractCatalog")
                            .getDeclaredMethod("disposition", String.class);
            var mutationContract =
                    Class.forName(
                                    "org.apache.hertzbeat.ai.gateway.runtime.AgentApplicationMutationSemantics")
                            .getDeclaredMethod("supports", String.class);
            readContract.setAccessible(true);
            mutationContract.setAccessible(true);
            List<Map<String, Object>> runtimeContracts = new ArrayList<>();
            for (var descriptor : descriptors) {
                boolean read = descriptor.getRisk() == AgentToolRisk.READ;
                String disposition =
                        read
                                ? String.valueOf(readContract.invoke(null, descriptor.getName()))
                                : Boolean.TRUE.equals(
                                                mutationContract.invoke(null, descriptor.getName()))
                                        ? "typed-mutation-contract"
                                        : "no-typed-task-mutation-completion-contract";
                runtimeContracts.add(
                        Map.of(
                                "tool",
                                descriptor.getName(),
                                "risk",
                                descriptor.getRisk().name(),
                                "runtimeContract",
                                disposition));
            }
            Files.writeString(
                    output.resolve("tool-runtime-contracts.json"),
                    JsonUtil.toJson(runtimeContracts));
        }
        var controllers = new ClassPathScanningCandidateComponentProvider(false);
        controllers.addIncludeFilter(new AnnotationTypeFilter(Controller.class));
        List<Map<String, Object>> routes = new ArrayList<>();
        for (var candidate : controllers.findCandidateComponents("org.apache.hertzbeat")) {
            var type =
                    ClassUtils.forName(candidate.getBeanClassName(), getClass().getClassLoader());
            if (type.getProtectionDomain()
                    .getCodeSource()
                    .getLocation()
                    .toString()
                    .contains("test-classes")) {
                continue;
            }
            var parent = AnnotatedElementUtils.findMergedAnnotation(type, RequestMapping.class);
            String[] prefixes = parent == null ? new String[] {""} : paths(parent);
            for (Method method : type.getDeclaredMethods()) {
                var mapping =
                        AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) {
                    continue;
                }
                for (String prefix : prefixes) {
                    for (String path : paths(mapping)) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("path", prefix + path);
                        item.put("http", Arrays.stream(mapping.method()).map(Enum::name).toList());
                        item.put("controller", type.getName());
                        item.put("method", method.getName());
                        item.put("javaSignature", method.toGenericString());
                        item.put("consumes", List.of(mapping.consumes()));
                        item.put("produces", List.of(mapping.produces()));
                        List<Map<String, Object>> inputs = new ArrayList<>();
                        for (var parameter : method.getParameters()) {
                            Map<String, Object> input = new LinkedHashMap<>();
                            input.put("name", parameter.getName());
                            input.put("type", parameter.getParameterizedType().getTypeName());
                            input.put(
                                    "requestBody",
                                    parameter.isAnnotationPresent(RequestBody.class));
                            if (parameter.isAnnotationPresent(RequestBody.class)) {
                                try {
                                    input.put(
                                            "schema",
                                            JsonSchemaGenerator.generateForType(
                                                    parameter.getParameterizedType()));
                                } catch (RuntimeException unsupported) {
                                    input.put("schemaStatus", "NATIVE_TYPE_REQUIRES_MANUAL_REVIEW");
                                }
                            }
                            inputs.add(input);
                        }
                        item.put("inputs", inputs);
                        routes.add(item);
                    }
                }
            }
        }
        assertTrue(routes.size() >= 200);
        Files.writeString(
                output.resolve("reflected-native-route-contracts.json"), JsonUtil.toJson(routes));
    }

    private String[] paths(RequestMapping mapping) {
        return mapping.path().length == 0 ? new String[] {""} : mapping.path();
    }

    private <T> void register(GenericApplicationContext context, Class<T> type) {
        context.registerBean(type, () -> mock(type));
    }
}
