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

package org.apache.hertzbeat.ai.sop.registry;


import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

/**
 * Registry for all @Tool annotated methods.
 * Automatically discovers and registers tool methods on first use.
 */
@Slf4j
@Component
public class ToolRegistry {

    private final ApplicationContext applicationContext;
    private final Map<String, ToolMethod> tools = new HashMap<>();
    private volatile boolean initialized = false;

    @Autowired
    public ToolRegistry(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    /**
     * Initialize the registry by scanning all beans for @Tool methods.
     * Uses double-checked locking for thread safety.
     */
    private void ensureInitialized() {
        if (!initialized) {
            synchronized (this) {
                if (!initialized) {
                    log.info("Scanning for @Tool annotated methods...");
                    scanAllBeans();
                    initialized = true;
                    log.info("Registered {} tool methods: {}", tools.size(), tools.keySet());
                }
            }
        }
    }

    private void scanAllBeans() {
        String[] beanNames = applicationContext.getBeanDefinitionNames();
        for (String beanName : beanNames) {
            try {
                Object bean = applicationContext.getBean(beanName);
                scanBeanForTools(bean);
            } catch (Exception e) {
                // Skip beans that cannot be instantiated
                log.trace("Skipping bean {}: {}", beanName, e.getMessage());
            }
        }
    }

    private void scanBeanForTools(Object bean) {
        Class<?> clazz = bean.getClass();
        
        // Handle Spring proxies
        if (clazz.getName().contains("$$")) {
            clazz = clazz.getSuperclass();
        }
        
        for (Method method : clazz.getMethods()) {
            Tool toolAnnotation = method.getAnnotation(Tool.class);
            if (toolAnnotation != null) {
                String toolName = toolAnnotation.name();
                if (toolName.isEmpty()) {
                    toolName = method.getName();
                }
                
                ToolMethod toolMethod = new ToolMethod(bean, method, toolAnnotation);
                tools.put(toolName, toolMethod);
                log.debug("Registered tool: {} -> {}.{}", 
                        toolName, clazz.getSimpleName(), method.getName());
            }
        }
    }

    /**
     * Invoke a tool by name with the given arguments.
     */
    public String invoke(String toolName, Map<String, Object> args) {
        ensureInitialized();
        ToolMethod toolMethod = tools.get(toolName);
        if (toolMethod == null) {
            throw new IllegalArgumentException("Unknown tool: " + toolName 
                    + ". Available tools: " + tools.keySet());
        }
        return toolMethod.invoke(args);
    }

    /**
     * Check if a tool exists.
     */
    public boolean hasMethod(String toolName) {
        ensureInitialized();
        return tools.containsKey(toolName);
    }

    /**
     * Get all registered tool names.
     */
    public Set<String> getToolNames() {
        ensureInitialized();
        return tools.keySet();
    }

    /**
     * Get tool method info.
     */
    public ToolMethod getToolMethod(String toolName) {
        ensureInitialized();
        return tools.get(toolName);
    }

    /**
     * Represents a registered tool method.
     */
    public static class ToolMethod {
        private final Object bean;
        private final Method method;
        private final Tool annotation;
        private final List<ParamInfo> paramInfos;

        public ToolMethod(Object bean, Method method, Tool annotation) {
            this.bean = bean;
            this.method = method;
            this.annotation = annotation;
            this.paramInfos = extractParamInfos(method);
        }

        private List<ParamInfo> extractParamInfos(Method method) {
            List<ParamInfo> infos = new ArrayList<>();
            Parameter[] parameters = method.getParameters();
            
            for (Parameter param : parameters) {
                ToolParam toolParam = param.getAnnotation(ToolParam.class);
                String name = (toolParam != null && !toolParam.description().isEmpty()) 
                        ? param.getName() : param.getName();
                boolean required = toolParam != null && toolParam.required();
                
                infos.add(new ParamInfo(name, param.getType(), required));
            }
            
            return infos;
        }

        /**
         * Invoke this tool method with the given arguments.
         */
        public String invoke(Map<String, Object> args) {
            try {
                Object[] methodArgs = new Object[paramInfos.size()];
                
                for (int i = 0; i < paramInfos.size(); i++) {
                    ParamInfo paramInfo = paramInfos.get(i);
                    Object value = args.get(paramInfo.name);
                    methodArgs[i] = convertValue(value, paramInfo.type);
                }
                
                Object result = method.invoke(bean, methodArgs);
                return result != null ? result.toString() : "";
                
            } catch (Exception e) {
                log.error("Failed to invoke tool {}: {}", annotation.name(), e.getMessage(), e);
                throw new RuntimeException("Tool invocation failed: " + annotation.name(), e);
            }
        }

        private Object convertValue(Object value, Class<?> targetType) {
            if (value == null) {
                return null;
            }
            
            if (targetType.isAssignableFrom(value.getClass())) {
                return value;
            }
            
            String strValue = String.valueOf(value);
            
            if (targetType == String.class) {
                return strValue;
            } else if (targetType == Integer.class || targetType == int.class) {
                return strValue.isEmpty() ? null : Integer.valueOf(strValue);
            } else if (targetType == Long.class || targetType == long.class) {
                return strValue.isEmpty() ? null : Long.valueOf(strValue);
            } else if (targetType == Boolean.class || targetType == boolean.class) {
                return Boolean.valueOf(strValue);
            } else if (targetType == Byte.class || targetType == byte.class) {
                return strValue.isEmpty() ? null : Byte.valueOf(strValue);
            } else if (targetType == Double.class || targetType == double.class) {
                return strValue.isEmpty() ? null : Double.valueOf(strValue);
            } else if (targetType == Float.class || targetType == float.class) {
                return strValue.isEmpty() ? null : Float.valueOf(strValue);
            } else if (targetType == List.class) {
                return parseList(strValue);
            }
            
            return value;
        }

        @SuppressWarnings("unchecked")
        private List<Long> parseList(String value) {
            if (value == null || value.isEmpty()) {
                return new ArrayList<>();
            }
            List<Long> result = new ArrayList<>();
            for (String s : value.split(",")) {
                if (!s.trim().isEmpty()) {
                    result.add(Long.valueOf(s.trim()));
                }
            }
            return result;
        }

        public String getName() {
            return annotation.name();
        }

        public String getDescription() {
            return annotation.description();
        }

        public List<ParamInfo> getParamInfos() {
            return paramInfos;
        }
    }

    /**
     * Parameter information for a tool method.
     */
    public static class ParamInfo {
        private final String name;
        private final Class<?> type;
        private final boolean required;

        public ParamInfo(String name, Class<?> type, boolean required) {
            this.name = name;
            this.type = type;
            this.required = required;
        }

        public String getName() {
            return name;
        }

        public Class<?> getType() {
            return type;
        }

        public boolean isRequired() {
            return required;
        }
    }
}
