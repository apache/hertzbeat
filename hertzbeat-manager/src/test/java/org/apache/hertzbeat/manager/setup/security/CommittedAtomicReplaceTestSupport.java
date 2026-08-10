/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.security;

import java.io.IOException;
import java.nio.file.Path;

/** Test-only proof that the atomic replacement committed before parent-directory force failed. */
public final class CommittedAtomicReplaceTestSupport {

    private CommittedAtomicReplaceTestSupport() {
    }

    public static void replaceThenFailParentForce(Path root, Path source, Path target) throws IOException {
        SecureSetupFile.atomicReplace(root, source, target, ignored -> {
            throw new IOException("simulated parent-directory force failure");
        });
    }
}
