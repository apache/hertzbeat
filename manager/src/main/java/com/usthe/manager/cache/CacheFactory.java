package com.usthe.manager.cache;

/**
 * @author ceilzcx
 * @since 4/2/2023
 */
public class CacheFactory {
    private CacheFactory() {}

    /**
     * 获取默认的cache
     * todo 后续优化
     * @return caffeine cache
     */
    public static ICacheService getCache() {
        return new CaffeineCacheServiceImpl();
    }
}
