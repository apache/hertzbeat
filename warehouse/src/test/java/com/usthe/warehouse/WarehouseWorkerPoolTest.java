package com.usthe.warehouse;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link WarehouseWorkerPool}
 */
class WarehouseWorkerPoolTest {

    private static final int NUMBER_OF_THREADS = 10;
    private WarehouseWorkerPool pool;
    private AtomicInteger counter;
    private CountDownLatch latch;

    @BeforeEach
    void setUp() {
        pool = new WarehouseWorkerPool();
        counter = new AtomicInteger();
        latch = new CountDownLatch(NUMBER_OF_THREADS);
    }

    @Test
    void executeJob() throws InterruptedException {
        for (int i = 0; i < NUMBER_OF_THREADS; i++) {
            pool.executeJob(() -> {
                counter.incrementAndGet();
                latch.countDown();
            });
        }
        latch.await();

        assertEquals(NUMBER_OF_THREADS, counter.get());
    }

}
