/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.security;

import java.io.IOException;

/** Rename committed the new file, but parent-directory durability could not be confirmed. */
public final class CommittedSetupFileDurabilityException extends IOException {

    public CommittedSetupFileDurabilityException() {
        super("Setup file committed with uncertain directory durability");
    }
}
