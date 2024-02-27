package org.dromara.hertzbeat.common.util;

/**
 * map initial capacity calculation
 * @author hdd
 */
public class MapCapUtil {


    private static final float LOAD_FACTOR = 0.75f;

    /**
     * Prevent expansion
     * @param size size
     * @return capacity
     */
    public static int calInitMap(int size) {
        return (int) Math.ceil (size / LOAD_FACTOR);
    }
}
