package com.usthe.manager.cache;

/**
 * @author ceilzcx
 * @since 4/2/2023
 */
public interface ICacheService {

    Object get(Object key);

    <T> T get(Object key, Class<T> clazz);

    void put(Object key, Object value);

    boolean containsKey(Object key);

    void remove(Object key);
}
