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

package com.usthe.collector.collect.common.cache;


import com.googlecode.concurrentlinkedhashmap.ConcurrentLinkedHashMap;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * lru cache 对连接对象进行缓存
 * @author tomsun28
 * @date 2021-12-10 23:17
 */
@Slf4j
public class CommonCache {

    /**
     * 默认缓存时间 800s
     */
    private static final long DEFAULT_CACHE_TIMEOUT = 800 * 1000L;

    /**
     * 默认最大缓存数量
     */
    private static final int DEFAULT_MAX_CAPACITY = 10000;

    /**
     * cacheTime数组大小
     */
    private static final int CACHE_TIME_LENGTH = 2;

    /**
     * 存储对象的数据过期时间点
     */
    private Map<Object, Long[]> timeoutMap;

    /**
     * 存储缓存对象
     */
    private ConcurrentLinkedHashMap<Object, Object> cacheMap;

    /**
     * 过期数据清理线程池
     */
    private ThreadPoolExecutor cleanTimeoutExecutor;

    private CommonCache() { init();}

    /**
     * 初始化 cache
     */
    private void init() {
        // 初始化lru hashmap
        cacheMap = new ConcurrentLinkedHashMap
                .Builder<>()
                .maximumWeightedCapacity(DEFAULT_MAX_CAPACITY)
                .listener((key, value) -> {
                    timeoutMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        ((CacheCloseable)value).close();
                    }
                    log.info("lru cache discard key: {}, value: {}.", key, value);
                }).build();

        // 初始化时间纪录map
        timeoutMap = new ConcurrentHashMap<>(DEFAULT_MAX_CAPACITY >> 6);

        // 初始化过期数据清理线程池
        cleanTimeoutExecutor = new ThreadPoolExecutor(1, 1,
                1, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(1), r -> new Thread("lru-cache-timeout-cleaner"),
                new ThreadPoolExecutor.DiscardOldestPolicy());

        // 初始化可用性探测定位任务,每次探测间隔时间为20分钟
        ScheduledThreadPoolExecutor scheduledExecutor =  new ScheduledThreadPoolExecutor(1,
                r -> new Thread(r, "lru-cache-available-detector"));
        scheduledExecutor.scheduleWithFixedDelay(this::detectCacheAvailable,
                2,20, TimeUnit.MINUTES);
    }

    /**
     * 探测所有可探测的缓存对象的可用性，清除不可用和过期对象
     */
    private void detectCacheAvailable() {
        try {
            cacheMap.forEach((key, value) -> {
                // 先判断是否过期
                Long[] cacheTime = timeoutMap.get(key);
                long currentTime = System.currentTimeMillis();
                if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH
                        || cacheTime[0] + cacheTime[1] < currentTime) {
                    cacheMap.remove(key);
                    timeoutMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        ((CacheCloseable)value).close();
                    }

                }
            });
        } catch (Exception e) {
            log.error("detect cache available error: {}.", e.getMessage(), e);
        }
    }

    /**
     * 清理过期线程
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
                    // 过期了 discard 关闭这个cache的资源
                    log.warn("[cache] clean the timeout cache, key {}", key);
                    timeoutMap.remove(key);
                    cacheMap.remove(key);
                    if (value instanceof CacheCloseable) {
                        log.warn("[cache] close the timeout cache, key {}", key);
                        ((CacheCloseable)value).close();
                    }
                }
            });
        } catch (Exception e) {
            log.error("[cache] clean timeout cache error: {}.", e.getMessage(), e);
        }
    }

    /**
     * 新增或更新cache
     * @param key 存储对象key
     * @param value 存储对象
     * @param timeDiff 缓存对象保存时间 millis
     */
    public void addCache(Object key, Object value, Long timeDiff) {
        if (timeDiff == null) {
            timeDiff = DEFAULT_CACHE_TIMEOUT;
        }
        cacheMap.put(key, value);
        timeoutMap.put(key, new Long[]{System.currentTimeMillis(), timeDiff});
        cleanTimeoutExecutor.execute(() -> {
            try {
                cleanTimeoutCache();
                Thread.sleep(10 * 1000);
            } catch (InterruptedException e) {
                log.error(e.getMessage(), e);
            }
        });
    }

    /**
     * 新增或更新cache
     * @param key 存储对象key
     * @param value 存储对象
     */
    public void addCache(Object key, Object value) {
        addCache(key, value, DEFAULT_CACHE_TIMEOUT);
    }

    /**
     * 根据缓存key获取缓存对象
     * @param key key
     * @param refreshCache 是否刷新命中的缓存的存活时间 true是,false否
     * @return 缓存对象
     */
    public Optional<Object> getCache(Object key, boolean refreshCache) {
        Long[] cacheTime = timeoutMap.get(key);
        if (cacheTime == null || cacheTime.length != CACHE_TIME_LENGTH) {
            log.info("[cache] not hit the cache, key {}.", key);
            return Optional.empty();
        }
        if (cacheTime[0] + cacheTime[1] < System.currentTimeMillis()) {
            log.warn("[cache] is timeout, remove it, key {}.", key);
            timeoutMap.remove(key);
            cacheMap.remove(key);
            return Optional.empty();
        }
        Object value = cacheMap.get(key);
        if (value == null) {
            log.error("[cache] value is null, remove it, key {}.", key);
            cacheMap.remove(key);
            timeoutMap.remove(key);
        } else if (refreshCache) {
            cacheTime[0] = System.currentTimeMillis();
            timeoutMap.put(key, cacheTime);
        }
        return Optional.ofNullable(value);
    }

    /**
     * 根据缓存key删除缓存对象
     * @param key key
     */
    public void removeCache(Object key) {
        timeoutMap.remove(key);
        cacheMap.remove(key);
    }

    /**
     * 获取缓存实例
     * @return cache
     */
    public static CommonCache getInstance() {
        return SingleInstance.INSTANCE;
    }

    /**
     * 静态内部类
     */
    private static class SingleInstance {
        /**
         * 单例
         */
        private static final CommonCache INSTANCE= new CommonCache();
    }
}
