package com.usthe.collector.collect.common.cache;

/**
 * 连接资源关闭回调接口
 * @author tomsun28
 * @date 2022/1/1 21:03
 */
public interface CacheCloseable {

    /**
     * 在缓存remove掉此对象前，回调接口对连接对象进行相关资源的释放
     */
    void close();
}
