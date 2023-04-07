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

package org.dromara.hertzbeat.manager.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.time.Duration;

/**
 * @author ceilzcx
 * @since 4/2/2023
 */
public class CaffeineCacheServiceImpl implements ICacheService {
    private static final Cache<Object, Object> DEFAULT_CACHE;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    static {
        // 默认使用一天后过期
        DEFAULT_CACHE = Caffeine
                .newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofDays(1))
                .build();
    }

    @Override
    public Object get(Object key) {
        return DEFAULT_CACHE.getIfPresent(key);
    }

    @Override
    public <T> T get(Object key, Class<T> clazz) {
        Object value = this.get(key);
        if (value != null) {
            return OBJECT_MAPPER.convertValue(value, clazz);
        }
        return null;
    }

    @Override
    public void put(Object key, Object value) {
        DEFAULT_CACHE.put(key, value);
    }

    @Override
    public boolean containsKey(Object key) {
        return DEFAULT_CACHE.asMap().containsKey(key);
    }

    @Override
    public void remove(Object key) {
        DEFAULT_CACHE.invalidate(key);
    }
}
