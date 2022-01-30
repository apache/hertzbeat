package com.usthe.common.util;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 最近最少使用淘汰算法map
 * @author tom
 * @date 2021/12/27 14:13
 */
public class LruHashMap<K, V> extends LinkedHashMap<K, V> {

    private int threshold;

    public LruHashMap(int threshold) {
        super(16, 0.75f, true);
        this.threshold = threshold;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry eldest) {
        return size() > threshold;
    }

}
