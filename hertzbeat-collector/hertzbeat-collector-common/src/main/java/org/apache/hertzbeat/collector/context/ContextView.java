package org.apache.hertzbeat.collector.context;

/**
 * 对上下文内容的查询操作
 */
public interface ContextView {
    <T> T get(Object key);

    <T> T getOrDefault(Object key, T defaultValue);

    boolean hasKey(Object key);
}
