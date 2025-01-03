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

package org.apache.hertzbeat.common.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;

/**
 * caffeine cache impl
 */
public class CaffeineCacheServiceImpl<K, V> implements CommonCacheService<K, V> {
    private final Cache<K, V> cache;

    public CaffeineCacheServiceImpl(final int initialCapacity, final long maximumSize, final Duration expireAfterWrite, final boolean useWeakKey) {
        if (useWeakKey) {
            this.cache = Caffeine.newBuilder()
                    .weakKeys()
                    .initialCapacity(initialCapacity)
                    .maximumSize(maximumSize)
                    .expireAfterWrite(expireAfterWrite)
                    .build();
        } else {
            this.cache = Caffeine.newBuilder()
                    .initialCapacity(initialCapacity)
                    .maximumSize(maximumSize)
                    .expireAfterWrite(expireAfterWrite)
                    .build();
        }
    }

    @Override
    public V get(K key) {
        return cache.getIfPresent(key);
    }

    @Override
    public void put(K key, V value) {
        cache.put(key, value);
    }

    @Override
    public V putAndGetOld(K key, V value) {
        V oldValue = cache.getIfPresent(key);
        cache.put(key, value);
        return oldValue;
    }

    @Override
    public boolean containsKey(K key) {
        return cache.asMap().containsKey(key);
    }

    @Override
    public V remove(K key) {
        V value = cache.getIfPresent(key);
        this.cache.invalidate(key);
        this.cache.cleanUp();
        return value;
    }

    @Override
    public boolean clear() {
        this.cache.invalidateAll();
        this.cache.cleanUp();
        return true;
    }
}
