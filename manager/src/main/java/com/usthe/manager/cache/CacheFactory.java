package com.usthe.manager.cache;

/**
 * @author ceilzcx
 * @since 4/2/2023
 */
public class CacheFactory {
    private CacheFactory() {}

    // todo 后续优化
    public static ICacheService getCache() {
        return new CaffeineCacheService();
    }
}
