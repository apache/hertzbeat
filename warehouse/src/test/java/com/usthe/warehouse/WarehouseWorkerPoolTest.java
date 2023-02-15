package com.usthe.warehouse;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Test case for {@link WarehouseWorkerPool}
 */
class WarehouseWorkerPoolTest {
    private WarehouseWorkerPool pool;

    @BeforeEach
    void setUp() {
        pool = new WarehouseWorkerPool();
    }

    @Test
    void executeJob() throws InterruptedException {
        int numberOfThreads = 10;
        AtomicInteger counter = new AtomicInteger();
        CountDownLatch latch = new CountDownLatch(numberOfThreads);

        for (int i = 0; i < numberOfThreads; i++) {
            pool.executeJob(() -> {
                counter.incrementAndGet();
                latch.countDown();
            });
        }
        latch.await();

        Assertions.assertEquals(numberOfThreads, counter.get());
    }

}
