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
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;

/**
 * lru common resource cache for client-server connection
 */
@Slf4j
public class ConnectionCommonCache<T, C extends AbstractConnection<?>> {
    
    /**
     * default cache time 600s
     */
    private static final long DEFAULT_CACHE_TIMEOUT = 600 * 1000L;

    /**
     * cacheTime length
     */
    private static final int CACHE_TIME_LENGTH = 2;

    /**
     * cache timeout map
     */
    private Map<T, Long[]> timeoutMap;

    /**
     * object cache
     */
    private ConcurrentLinkedHashMap<T, C> cacheMap;

    public ConnectionCommonCache() {
        initCache();
    }

    private void initCache() {
        cacheMap = new ConcurrentLinkedHashMap
                .Builder<T, C>()
                .maximumWeightedCapacity(Integer.MAX_VALUE)
                .listener((key, value) -> {
                    timeoutMap.remove(key);
                    try {
                        value.close();
                    } catch (Exception e) {
                        log.error("connection close error: {}.", e.getMessage(), e);
                    }
                    log.info("connection common cache discard key: {}, value: {}.", key, value);
                }).build();
        timeoutMap = new ConcurrentHashMap<>(16);
        // init monitor available detector cyc task
        ThreadFactory threadFactory = new ThreadFactoryBuilder()
                .setNameFormat("connection-cache-timout-detector-%d")
                .setDaemon(true)
                .build();
        ScheduledThreadPoolExecutor scheduledExecutor = new ScheduledThreadPoolExecutor(1, threadFactory);
        scheduledExecutor.scheduleWithFixedDelay(this::cleanTimeoutOrUnHealthCache, 2, 100, TimeUnit.SECONDS);
    }

    /**
     * clean and remove timeout cache
     */
    private void cleanTimeoutOrUnHealthCache() {
        try {
            cacheMap.forEach((key, value) -> {
                // index 0 is startTime, 1 is timeDiff
                Long[] cacheTime = timeoutMap.get(key);
                long currentTime = System.currentTimeMillis();
                if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH
                        || cacheTime[0] + cacheTime[1] < currentTime) {
                    log.warn("[connection common cache] clean the timeout cache, key {}", key);
                    timeoutMap.remove(key);
                    cacheMap.remove(key);
                    try {
                        value.close();
                    } catch (Exception e) {
                        log.error("clean connection close error: {}.", e.getMessage(), e);
                    }
                }
            });
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
    public void addCache(T key, C value, Long timeDiff) {
        removeCache(key);
        if (timeDiff == null) {
            timeDiff = DEFAULT_CACHE_TIMEOUT;
        }
        cacheMap.put(key, value);
        timeoutMap.put(key, new Long[]{System.currentTimeMillis(), timeDiff});
    }

    /**
     * add update cache
     *
     * @param key   cache key
     * @param value cache value
     */
    public void addCache(T key, C value) {
        addCache(key, value, DEFAULT_CACHE_TIMEOUT);
    }

    /**
     * get cache by key
     *
     * @param key          cache key
     * @param refreshCache is refresh cache
     * @return cache object
     */
    public Optional<C> getCache(T key, boolean refreshCache) {
        Long[] cacheTime = timeoutMap.get(key);
        if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH) {
            log.info("[connection common cache] not hit the cache, key {}.", key);
            return Optional.empty();
        }
        if (cacheTime[0] + cacheTime[1] < System.currentTimeMillis()) {
            log.warn("[connection common cache] is timeout, remove it, key {}.", key);
            removeCache(key);
            return Optional.empty();
        }
        C value = cacheMap.compute(key, (k, v) -> {
            if (v == null) {
                log.error("[connection common cache] value is null, remove it, key {}.", key);
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
     * remove cache by key
     *
     * @param key key
     */
    public void removeCache(T key) {
        timeoutMap.remove(key);
        C value = cacheMap.remove(key);
        try {
            if (value == null) {
                return;
            }
            value.close();
        } catch (Exception e) {
            log.error("connection close error: {}.", e.getMessage(), e);
        }
    }

}
