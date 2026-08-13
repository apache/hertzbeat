/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;

/** Finalized bounded export payload; closing clears every owned byte. */
public final class StagedMigrationExport implements AutoCloseable {

    private final ExportResponse metadata;
    private byte[] bytes;
    private final int size;
    private State state = State.READY;

    StagedMigrationExport(ExportResponse metadata, byte[] bytes, int size) {
        this.metadata = Objects.requireNonNull(metadata, "metadata");
        this.bytes = Objects.requireNonNull(bytes, "bytes");
        if (size < 0 || size > bytes.length) {
            throw new IllegalArgumentException("size");
        }
        this.size = size;
    }

    public ExportResponse metadata() {
        return metadata;
    }

    public int size() {
        return size;
    }

    public void writeTo(OutputStream output) throws IOException {
        Objects.requireNonNull(output, "output");
        byte[] payload = beginWrite();
        try {
            output.write(payload, 0, size);
        } finally {
            finishWrite();
        }
    }

    @Override
    public synchronized void close() {
        if (state == State.CLOSED) {
            return;
        }
        if (state == State.WRITING) {
            throw new PreparedMigrationExportException();
        }
        clear();
    }

    private synchronized byte[] beginWrite() {
        if (state != State.READY) {
            throw new PreparedMigrationExportException();
        }
        state = State.WRITING;
        return bytes;
    }

    private synchronized void finishWrite() {
        clear();
    }

    private void clear() {
        Arrays.fill(bytes, (byte) 0);
        bytes = new byte[0];
        state = State.CLOSED;
    }

    private enum State {
        READY,
        WRITING,
        CLOSED
    }
}
