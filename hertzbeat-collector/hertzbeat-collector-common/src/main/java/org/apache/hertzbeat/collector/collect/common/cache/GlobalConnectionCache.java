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


package org.apache.hertzbeat.collector.collect.common.cache;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * Singleton LRU global resource cache for client-server connections
 */
@Slf4j
public class GlobalConnectionCache {

    /**
     * Default cache time: 600 seconds
     */
    private static final long DEFAULT_CACHE_TIMEOUT = 600 * 1000L;

    /**
     * Cache time length
     */
    private static final int CACHE_TIME_LENGTH = 2;


    /**
     * Cache timeout map
     */
    private final Map<Object, Long[]> timeoutMap = new ConcurrentHashMap<>(32);

    /**
     * Object cache
     */
    private final ConcurrentLinkedHashMap<Object, AbstractConnection<?>> cacheMap;

    /**
     * Private constructor to prevent instantiation
     */
    private GlobalConnectionCache() {
        cacheMap = new ConcurrentLinkedHashMap.Builder<Object, AbstractConnection<?>>()
                .maximumWeightedCapacity(Integer.MAX_VALUE)
                .listener((key, value) -> {
                    timeoutMap.remove(key);
                    try {
                        value.close();
                    } catch (Exception e) {
                        log.error("Connection close error for key {}: {}", key, e.getMessage(), e);
                    }
                    log.info("GlobalConnectionCache discarded key: {}, value: {}.", key, value);
                })
                .build();
        initCacheMonitor();
    }

    /**
     * Holder class for lazy-loaded singleton instance
     */
    private static class Holder {
        private static final GlobalConnectionCache INSTANCE = new GlobalConnectionCache();
    }

    /**
     * Get the singleton instance
     *
     * @return GlobalConnectionCache instance
     */
    public static GlobalConnectionCache getInstance() {
        return Holder.INSTANCE;
    }

    /**
     * Initialize the cache monitor for cleaning up expired connections
     */
    private void initCacheMonitor() {
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setNameFormat("connection-cache-timeout-detector-%d")
                .setDaemon(true)
                .build();
        ScheduledThreadPoolExecutor scheduledExecutor = new ScheduledThreadPoolExecutor(1, threadFactory);
        scheduledExecutor.scheduleWithFixedDelay(this::cleanTimeoutOrUnHealthyCache, 2, 100, TimeUnit.SECONDS);
    }

    /**
     * Clean and remove timeout or unhealthy cache entries
     */
    private void cleanTimeoutOrUnHealthyCache() {
        try {
            cacheMap.forEach((key, value) -> {
                Long[] cacheTime = timeoutMap.get(key);
                long currentTime = System.currentTimeMillis();
                if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH
                        || cacheTime[0] + cacheTime[1] < currentTime) {
                    log.warn("[GlobalConnectionCache] Cleaning timeout cache, key {}", key);
                    timeoutMap.remove(key);
                    cacheMap.remove(key);
                    try {
                        value.close();
                    } catch (Exception e) {
                        log.error("Clean connection close error for key {}: {}", key, e.getMessage(), e);
                    }
                }
            });
        } catch (Exception e) {
            log.error("[GlobalConnectionCache] Error cleaning timeout cache: {}", e.getMessage(), e);
        }
    }

    /**
     * Add or update cache entry
     *
     * @param key      Cache key
     * @param value    Cache value
     * @param timeDiff Cache time in milliseconds
     */
    public void addCache(Object key, AbstractConnection<?> value, Long timeDiff) {
        removeCache(key);
        if (timeDiff == null) {
            timeDiff = DEFAULT_CACHE_TIMEOUT;
        }
        cacheMap.put(key, value);
        timeoutMap.put(key, new Long[]{System.currentTimeMillis(), timeDiff});
    }

    /**
     * Add or update cache entry with default timeout
     *
     * @param key   Cache key
     * @param value Cache value
     */
    public void addCache(Object key, AbstractConnection<?> value) {
        addCache(key, value, DEFAULT_CACHE_TIMEOUT);
    }

    /**
     * Get cache by key
     *
     * @param key          Cache key
     * @param refreshCache Whether to refresh the cache timeout
     * @return Optional containing the cached connection if present and valid
     */
    public Optional<AbstractConnection<?>> getCache(Object key, boolean refreshCache) {
        Long[] cacheTime = timeoutMap.get(key);
        if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH) {
            log.info("[GlobalConnectionCache] Cache miss for key {}.", key);
            removeCache(key);
            return Optional.empty();
        }
        if (cacheTime[0] + cacheTime[1] < System.currentTimeMillis()) {
            log.warn("[GlobalConnectionCache] Cache entry expired for key {}.", key);
            removeCache(key);
            return Optional.empty();
        }
        AbstractConnection<?> value = cacheMap.compute(key, (k, v) -> {
            if (v == null) {
                log.error("[GlobalConnectionCache] Value is null, removing key {}.", key);
                timeoutMap.remove(key);
                return null;
            }
            if (refreshCache) {
                cacheTime[0] = System.currentTimeMillis();
                timeoutMap.put(key, cacheTime);
            }
            return v;
        });
        return Optional.ofNullable(value);
    }

    /**
     * Remove cache by key
     *
     * @param key Cache key
     */
    public void removeCache(Object key) {
        timeoutMap.remove(key);
        AbstractConnection<?> value = cacheMap.remove(key);
        try {
            if (value != null) {
                value.close();
            }
        } catch (Exception e) {
            log.error("Connection close error for key {}: {}", key, e.getMessage(), e);
        }
    }
}
