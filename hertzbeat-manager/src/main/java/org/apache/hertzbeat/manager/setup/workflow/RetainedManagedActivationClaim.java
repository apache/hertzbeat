/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;

/** Atomic state claim that either runs activation or replays its retained completion. */
record RetainedManagedActivationClaim(
        RetainedCutoverState.Execution execution,
        RetainedManagedActivationResult replay) {

    RetainedManagedActivationClaim {
        if ((execution == null) == (replay == null)) {
            throw new IllegalArgumentException("An activation claim must execute or replay");
        }
    }

    static RetainedManagedActivationClaim execute(RetainedCutoverState.Execution execution) {
        return new RetainedManagedActivationClaim(
                Objects.requireNonNull(execution, "execution"), null);
    }

    static RetainedManagedActivationClaim replay(RetainedManagedActivationResult replay) {
        return new RetainedManagedActivationClaim(null, Objects.requireNonNull(replay, "replay"));
    }

    boolean completed() {
        return replay != null;
    }
}
