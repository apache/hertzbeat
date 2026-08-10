/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Objects;

/** Renderer-facing view that cannot close or clear its owner-managed buffer. */
final class NonClosingMigrationExportStream extends OutputStream {

    private final OutputStream delegate;

    NonClosingMigrationExportStream(OutputStream delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate");
    }

    @Override
    public void write(int value) throws IOException {
        delegate.write(value);
    }

    @Override
    public void write(byte[] bytes, int offset, int length) throws IOException {
        delegate.write(bytes, offset, length);
    }

    @Override
    public void flush() throws IOException {
        delegate.flush();
    }

    @Override
    public void close() {
        // The renderer borrows this view; buffer ownership remains with PreparedMigrationExport.
    }
}
