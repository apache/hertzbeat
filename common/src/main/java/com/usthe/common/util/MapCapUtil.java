package com.usthe.common.util;

/**
 * map initial capacity calculation
 * @author: hdd
 * @create: 2023/03/04
 */
public class MapCapUtil {


    private static final float LOAD_FACTOR = 0.75f;

    /**
     * Prevent expansion
     * @param size
     * @return
     */
    public static int calInitMap(int size) {
        return (int) Math.ceil (size / LOAD_FACTOR);
    }
}
