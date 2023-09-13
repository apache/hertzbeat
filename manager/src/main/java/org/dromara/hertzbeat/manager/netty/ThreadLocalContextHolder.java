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

package org.dromara.hertzbeat.manager.netty;

import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

/**
 * thread local context data holder
 * learn from apache shiro
 */
@Slf4j
public class ThreadLocalContextHolder {

    public static final String IDENTITY = "IDENTITY";

    private static final ThreadLocal<Map<Object, Object>> RESOURCES = InheritableThreadLocal
            .withInitial(() -> new HashMap<>(8));

    /**
     * Called before the thread ends
     */
    public static void clear() {
        if (RESOURCES.get() != null) {
            RESOURCES.get().clear();
        }
        RESOURCES.remove();
    }

    public static void bind(Object key, Object value) {
        internalPut(key, value);
    }

    public static void unbind(Object key) {
        if (key != null) {
            internalRemove(key);
        }
    }

    public static Object getBind(Object key) {
        if (key == null) {
            return null;
        }
        return internalGet(key);
    }
    
    public static void bindIdentity(String identity) {
        internalPut(IDENTITY, identity);
    }

    public static void unbindIdentity() {
        internalRemove(IDENTITY);
    }


    public static String getBindIdentity() {
        return (String) internalGet(IDENTITY);
    }


    private static void internalPut(Object key, Object value) {
        if (key == null) {
            throw new NullPointerException("key cannot be null");
        } else if (value == null) {
            internalRemove(key);
        } else {
            ensureResourcesInitialized();
            RESOURCES.get().put(key, value);
        }
    }

    private static Object internalGet(Object key) {
        if (log.isTraceEnabled()) {
            log.trace("get() - in thread [{}]", Thread.currentThread().getName());
        }
        Map<Object, Object> perThreadResources = RESOURCES.get();
        return perThreadResources != null ? perThreadResources.get(key) : null;
    }

    private static void internalRemove(Object key) {
        Map<Object, Object> perThreadResources = RESOURCES.get();
        if (perThreadResources != null) {
            perThreadResources.remove(key);
        }
    }

    private static void ensureResourcesInitialized() {
        if (RESOURCES.get() == null) {
            RESOURCES.set(new HashMap<>(8));
        }
    }
}
