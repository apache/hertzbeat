package com.usthe.common.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * @author tom
 * @date 2021/12/3 13:28
 */
class SnowFlakeIdGeneratorTest {

    @Test
    void generateId() {
        // 注意 由于前端JS TS 在json解析大数会造成精度丢失 UUID 不能超过 9007199254740991（16位）
        for (int i = 0; i < 1000; i++) {
            long id = SnowFlakeIdGenerator.generateId();
            Assertions.assertTrue(id < 9007199254740991L);
        }
    }
}