package com.usthe.common.util;

/**
 * Snowflake Algorithm Generator Tool
 * 雪花算法生成器工具
 *
 * @author tomsun28
 * @date 2021/11/10 11:04
 */
public class SnowFlakeIdGenerator {

    private final static SnowFlakeIdWorker ID_WORKER;

    static {
        ID_WORKER = new SnowFlakeIdWorker(0);
    }

    public static long generateId() {
        return ID_WORKER.nextId();
    }
}
