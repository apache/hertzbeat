/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.file.Path;

/** Narrow root-bound publication and durability boundary for migration candidate files. */
interface MigrationCandidateFileIo {

    /** Consumes the caller-owned bytes synchronously without retaining or modifying them. */
    void publish(Path target, byte[] content) throws IOException;

    /** Confirms prior candidate directory-entry mutations without changing candidate bytes. */
    void confirmDurability(Path target) throws IOException;
}
