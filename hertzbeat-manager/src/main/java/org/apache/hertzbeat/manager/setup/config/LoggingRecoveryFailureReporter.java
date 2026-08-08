/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Production adapter that logs only the pre-sanitized recovery diagnostic event. */
final class LoggingRecoveryFailureReporter implements RecoveryFailureReporter {
    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingRecoveryFailureReporter.class);

    @Override
    public void report(Failure failure) {
        LOGGER.warn("Managed configuration recovery failure stage={} store={} exception={} detail={}",
                failure.stage(), failure.store(), failure.exceptionClass(), failure.safeMessage());
    }
}
