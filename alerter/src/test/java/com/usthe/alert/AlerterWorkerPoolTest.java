package com.usthe.alert;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


/**
 * Test case for {@link AlerterWorkerPool}
 */
class AlerterWorkerPoolTest {

    private AlerterWorkerPool pool ;

    @BeforeEach
    void setUp() {
        pool = new AlerterWorkerPool();
    }

    @Test
    void executeJob() {
        for (int i = 1; i <= 10; i++) {
            int c = i;
            pool.executeJob(() -> {
                System.out.println("currentTIme ==> " + System.currentTimeMillis() + " threadName " + " ==> " + Thread.currentThread() + " current = " + c);
            });
        }
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("currentTIme ==> " + System.currentTimeMillis() + " threadName " + " ==> " + Thread.currentThread() + " done... ");
    }
}