package org.dromara.hertzbeat.common.cache;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;

/**
 * @author ceilzcx
 *
 */
class CaffeineCacheTest {
    private ICacheService<String, String> cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new CaffeineCacheServiceImpl<>(10, 100, Duration.ofMillis(3000), false);
    }

    @Test
    void testCache() throws InterruptedException {
        String key = "key";
        String value = "value";

        // test get & put
        cacheService.put(key, value);
        Assertions.assertEquals(value, cacheService.get(key));
        Assertions.assertTrue(cacheService.containsKey(key));

        // test remove
        cacheService.remove(key);
        Assertions.assertNull(cacheService.get(key));

        // test expire time
        cacheService.put(key, value);
        Thread.sleep(3000);
        Assertions.assertNull(cacheService.get(key));
        Assertions.assertNull(cacheService.get(key));

        // test clear
        for (int i = 0; i < 10; i++) {
            cacheService.put(key + i, value);
        }
        cacheService.clear();
        for (int i = 0; i < 10; i++) {
            Assertions.assertNull(cacheService.get(key + i));
        }
    }

}
