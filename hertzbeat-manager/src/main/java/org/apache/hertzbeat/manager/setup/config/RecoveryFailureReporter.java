/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

/** Secret-free diagnostic boundary for managed configuration recovery failures. */
@FunctionalInterface
public interface RecoveryFailureReporter {
    String SAFE_MESSAGE = "Managed configuration recovery operation failed";

    void report(Failure failure);

    default void report(Stage stage, Store store, Exception failure) {
        report(new Failure(stage, store, failure.getClass().getName(), SAFE_MESSAGE));
    }

    /** Recovery operation stage that failed. */
    enum Stage {
        DISCARD_CANDIDATE,
        PROMOTE_CANDIDATE,
        RESTORE_ACTIVE
    }

    /** Managed aggregate member involved in the failure. */
    enum Store {
        APPLICATION,
        SECRET
    }

    /** Fully sanitized diagnostic event safe for production logging. */
    record Failure(Stage stage, Store store, String exceptionClass, String safeMessage) {
    }
}
