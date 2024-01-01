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

package org.dromara.hertzbeat.collector.collect.common.cache;


import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.*;

/**
 * lru common resource cache for client-server connection
 *
 * @author tomsun28
 */
@Slf4j
public class ConnectionCommonCache {

    /**
     * default cache time 200s
     */
    private static final long DEFAULT_CACHE_TIMEOUT = 200 * 1000L;

    /**
     * default max cache num
     */
    private static final int DEFAULT_MAX_CAPACITY = 10000;

    /**
     * cacheTime length
     */
    private static final int CACHE_TIME_LENGTH = 2;

    /**
     * cache timeout map
     */
    private Map<Object, Long[]> timeoutMap;

    /**
     * object cache
     */
    private ConcurrentLinkedHashMap<Object, Object> cacheMap;

    /**
     * the executor who clean cache when timeout
     */
    private ThreadPoolExecutor timeoutCleanerExecutor;

    private ConnectionCommonCache() {
        init();
    }

    private void init() {
        cacheMap = new ConcurrentLinkedHashMap
                .Builder<>()
                .maximumWeightedCapacity(DEFAULT_MAX_CAPACITY)
                .listener((key, value) -> {
                    timeoutMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        ((CacheCloseable) value).close();
                    }
                    log.info("connection common cache discard key: {}, value: {}.", key, value);
                }).build();
        timeoutMap = new ConcurrentHashMap<>(DEFAULT_MAX_CAPACITY >> 6);
        // last-first-coverage algorithm, run the first and last thread, discard mid
        timeoutCleanerExecutor = new ThreadPoolExecutor(1, 1, 1, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(1),
                r -> new Thread(r, "connection-cache-timeout-cleaner"),
                new ThreadPoolExecutor.DiscardOldestPolicy());
        // init monitor available detector cyc task
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setNameFormat("connection-cache-ava-detector-%d")
                .setDaemon(true)
                .build();
        ScheduledThreadPoolExecutor scheduledExecutor = new ScheduledThreadPoolExecutor(1, threadFactory);
        scheduledExecutor.scheduleWithFixedDelay(this::detectCacheAvailable, 2, 20, TimeUnit.MINUTES);
    }

    /**
     * detect all cache available, cleanup not ava connection
     */
    private void detectCacheAvailable() {
        try {
            cacheMap.forEach((key, value) -> {
                Long[] cacheTime = timeoutMap.get(key);
                long currentTime = System.currentTimeMillis();
                if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH
                        || cacheTime[0] + cacheTime[1] < currentTime) {
                    cacheMap.remove(key);
                    timeoutMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        ((CacheCloseable) value).close();
                    }

                }
            });
        } catch (Exception e) {
            log.error("connection common cache detect cache available error: {}.", e.getMessage(), e);
        }
    }

    /**
     * clean timeout cache
     */
    private void cleanTimeoutCache() {
        try {
            cacheMap.forEach((key, value) -> {
                // index 0 is startTime, 1 is timeDiff
                Long[] cacheTime = timeoutMap.get(key);
                long currentTime = System.currentTimeMillis();
                if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH) {
                    timeoutMap.put(key, new Long[]{currentTime, DEFAULT_CACHE_TIMEOUT});
                } else if (cacheTime[0] + cacheTime[1] < currentTime) {
                    // timeout, remove this object cache
                    log.warn("[connection common cache] clean the timeout cache, key {}", key);
                    timeoutMap.remove(key);
                    cacheMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        log.warn("[connection common cache] close the timeout cache, key {}", key);
                        ((CacheCloseable) value).close();
                    }
                }
            });
            Thread.sleep(20 * 1000);
        } catch (Exception e) {
            log.error("[connection common cache] clean timeout cache error: {}.", e.getMessage(), e);
        }
    }

    /**
     * add update cache
     *
     * @param key      cache key
     * @param value    cache value
     * @param timeDiff cache time millis
     */
    public void addCache(Object key, Object value, Long timeDiff) {
        removeCache(key);
        if (timeDiff == null) {
            timeDiff = DEFAULT_CACHE_TIMEOUT;
        }
        cacheMap.put(key, value);
        timeoutMap.put(key, new Long[]{System.currentTimeMillis(), timeDiff});
        timeoutCleanerExecutor.execute(this::cleanTimeoutCache);
    }

    /**
     * add update cache
     *
     * @param key   cache key
     * @param value cache value
     */
    public void addCache(Object key, Object value) {
        addCache(key, value, DEFAULT_CACHE_TIMEOUT);
    }

    /**
     * get cache by key
     *
     * @param key          cache key
     * @param refreshCache is refresh cache
     * @return cache object
     */
    public Optional<Object> getCache(Object key, boolean refreshCache) {
        Long[] cacheTime = timeoutMap.get(key);
        if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH) {
            log.info("[connection common cache] not hit the cache, key {}.", key);
            return Optional.empty();
        }
        if (cacheTime[0] + cacheTime[1] < System.currentTimeMillis()) {
            log.warn("[connection common cache] is timeout, remove it, key {}.", key);
            timeoutMap.remove(key);
            cacheMap.remove(key);
            return Optional.empty();
        }
        Object value = cacheMap.get(key);
        if (value == null) {
            log.error("[connection common cache] value is null, remove it, key {}.", key);
            cacheMap.remove(key);
            timeoutMap.remove(key);
        } else if (refreshCache) {
            cacheTime[0] = System.currentTimeMillis();
            timeoutMap.put(key, cacheTime);
        }
        return Optional.ofNullable(value);
    }

    /**
     * remove cache by key
     *
     * @param key key
     */
    public void removeCache(Object key) {
        timeoutMap.remove(key);
        Object value = cacheMap.remove(key);
        if (value instanceof CacheCloseable) {
            ((CacheCloseable) value).close();
        }
    }

    /**
     * get common cache instance
     *
     * @return connection common cache
     */
    public static ConnectionCommonCache getInstance() {
        return SingleInstance.INSTANCE;
    }

    /**
     * static single instance
     */
    private static class SingleInstance {
        private static final ConnectionCommonCache INSTANCE = new ConnectionCommonCache();
    }
}
