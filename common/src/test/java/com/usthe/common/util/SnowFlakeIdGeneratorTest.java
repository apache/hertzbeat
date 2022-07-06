package com.usthe.common.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 *
 *
 */
class SnowFlakeIdGeneratorTest {

    @Test
    void generateId() {
        // 注意 由于前端JS TS 在json解析大数会造成精度丢失 UUID 不能超过 16进制 0x1FFFFFFFFFFFFF (小于53bit)
        // Note that because the front-end JS TS parses large numbers in json, the precision will be lost. UUID cannot exceed hexadecimal 0x1FFFFFFFFFFFFFF (less than 53bit)
        for (int i = 0; i < 10000; i++) {
            long id = SnowFlakeIdGenerator.generateId();
            Assertions.assertTrue(id < 0x1FFFFFFFFFFFFFL);
        }
    }
}