package com.usthe.manager.cache;

/**
 * common cache
 * @author ceilzcx
 * @since 4/2/2023
 */
public interface ICacheService {

    /**
     * get cache by key
     * @param key key
     * @return cache object
     */
    Object get(Object key);

    /**
     * get cache by key use clazz
     * @param key key
     * @param clazz clazz
     * @return object
     * @param <T> t
     */
    <T> T get(Object key, Class<T> clazz);

    /**
     * set cache
     * @param key key
     * @param value value
     */
    void put(Object key, Object value);

    /**
     * if contain cache by key
     * @param key key
     * @return true is contain
     */
    boolean containsKey(Object key);

    /**
     * remove cache
     * @param key key
     */
    void remove(Object key);
}
