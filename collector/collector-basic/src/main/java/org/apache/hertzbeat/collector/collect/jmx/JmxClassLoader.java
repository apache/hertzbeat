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

package org.apache.hertzbeat.collector.collect.jmx;

import lombok.extern.slf4j.Slf4j;

/**
 * custom class loader config for JMX
 */
@Slf4j
public class JmxClassLoader extends ClassLoader {

    private static final String[] WHITE_PRE_LIST = new String[]{
            "java.",
            "javax.management.",
            "org.apache.hertzbeat.",
            "org.springframework.util.",
            "com.sun.",
            "sun.",
            "org.slf4j.",
            "jdk.",
            "org.w3c.dom."
    };
    
    public JmxClassLoader(ClassLoader parent) {
        super(parent);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        for (String whitePre : WHITE_PRE_LIST) {
            if (name.startsWith(whitePre)) {
                return super.loadClass(name, resolve);
            }
        }
        log.error("Security vulnerability detection in JMX collect: Forbidden class: {}", name);
        throw new ClassNotFoundException("Forbidden unsafe collection request content");
    }

}
