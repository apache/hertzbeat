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
    void report(Stage stage, Store store, Exception failure);

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
}
