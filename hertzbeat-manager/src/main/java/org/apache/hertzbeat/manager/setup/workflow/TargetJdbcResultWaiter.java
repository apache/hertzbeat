/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Wait boundary used to arbitrate deadline expiry against a published result. */
@FunctionalInterface
interface TargetJdbcResultWaiter {

    TargetJdbcResultWaiter TIMED = (ready, remainingNanos) ->
            ready.await(remainingNanos, TimeUnit.NANOSECONDS);

    boolean await(CountDownLatch ready, long remainingNanos) throws InterruptedException;
}
