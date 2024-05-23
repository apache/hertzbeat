/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.util;

import com.google.common.collect.Maps;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.apache.commons.jexl3.JexlBuilder;
import org.apache.commons.jexl3.JexlContext;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.JexlFeatures;
import org.apache.commons.jexl3.MapContext;

/**
 * jexl express runner
 */
public class JexlExpressionRunner {

    private static final String LOADER_NAME = "jexl-class-loader";
    private static final JexlEngine jexlEngine;
    
    static {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        // set the root namespace function
        functions.put(null, new JexlCommonFunction());
        ClassLoader classLoader = new ClassLoader() {
            @Override
            public String getName() {
                return LOADER_NAME;
            }
        };
        JexlFeatures features = new JexlFeatures();
        features.annotation(false).loops(false).pragma(false)
                .methodCall(false).lambda(false).newInstance(false).register(false);
        jexlEngine = new JexlBuilder().charset(StandardCharsets.UTF_8).cache(256).loader(classLoader)
                .features(features).strict(true).silent(false).stackOverflow(40).namespaces(functions)
                .create();
    }
    
    public static Object evaluate(String expression, Map<String, Object> context) {
        JexlContext jexlContext = new MapContext();
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            jexlContext.set(entry.getKey(), entry.getValue());
        }
        return jexlEngine.createExpression(expression).evaluate(jexlContext);
    }

    public static Object evaluate(JexlExpression expression, Map<String, Object> context) {
        JexlContext jexlContext = new MapContext();
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            jexlContext.set(entry.getKey(), entry.getValue());
        }
        return expression.evaluate(jexlContext);
    }
    
    public static Object evaluate(String expression) {
        return jexlEngine.createExpression(expression).evaluate(new MapContext());
    }
    
    public static JexlExpression compile(String expression) {
        return jexlEngine.createExpression(expression);
    }
    
}
