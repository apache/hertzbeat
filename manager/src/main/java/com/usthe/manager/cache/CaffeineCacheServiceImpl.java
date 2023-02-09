package com.usthe.manager.cache;

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
