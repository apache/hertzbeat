/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** One-shot export preparation that owns only an independent clearable secret. */
public final class PreparedMigrationExport implements AutoCloseable {

    static final int MAX_EXPORT_BYTES = 1024 * 1024;

    private final ExportResponse metadata;
    private final SecretValue ownedSecret;
    private final MigrationExportRenderer renderer;
    private final BufferFactory bufferFactory;
    private State state = State.READY;

    private PreparedMigrationExport(
            ExportResponse metadata, SecretValue ownedSecret, MigrationExportRenderer renderer,
            BufferFactory bufferFactory) {
        this.metadata = Objects.requireNonNull(metadata, "metadata");
        this.ownedSecret = Objects.requireNonNull(ownedSecret, "ownedSecret");
        this.renderer = Objects.requireNonNull(renderer, "renderer");
        this.bufferFactory = Objects.requireNonNull(bufferFactory, "bufferFactory");
    }

    /** Copies the borrowed secret immediately; ownership of the caller's value never changes. */
    static PreparedMigrationExport prepare(
            ExportResponse metadata, SecretValue borrowedSecret, MigrationExportRenderer renderer) {
        Objects.requireNonNull(metadata, "metadata");
        Objects.requireNonNull(borrowedSecret, "borrowedSecret");
        Objects.requireNonNull(renderer, "renderer");
        return prepare(metadata, borrowedSecret, renderer, BoundedMigrationExportBuffer::new);
    }

    static PreparedMigrationExport prepare(
            ExportResponse metadata, SecretValue borrowedSecret, MigrationExportRenderer renderer,
            BufferFactory bufferFactory) {
        Objects.requireNonNull(metadata, "metadata");
        Objects.requireNonNull(borrowedSecret, "borrowedSecret");
        Objects.requireNonNull(renderer, "renderer");
        Objects.requireNonNull(bufferFactory, "bufferFactory");
        return new PreparedMigrationExport(
                metadata, SecretValue.copyOf(borrowedSecret), renderer, bufferFactory);
    }

    public ExportResponse metadata() {
        return metadata;
    }

    /** Renders and finalizes a bounded payload before any HTTP response is mutated. */
    public StagedMigrationExport stage() throws IOException {
        beginStage();
        BoundedMigrationExportBuffer buffer = null;
        boolean transferred = false;
        try {
            buffer = bufferFactory.create(MAX_EXPORT_BYTES);
            renderer.write(ownedSecret, new NonClosingMigrationExportStream(buffer));
            StagedMigrationExport staged = buffer.finish(metadata);
            transferred = true;
            return staged;
        } catch (IOException failure) {
            throw new IOException("Prepared migration export failed");
        } catch (RuntimeException failure) {
            throw new PreparedMigrationExportException();
        } finally {
            if (!transferred && buffer != null) {
                buffer.close();
            }
            ownedSecret.close();
            finishStage();
        }
    }

    @Override
    public synchronized void close() {
        if (state == State.CLOSED) {
            return;
        }
        if (state == State.STAGING) {
            throw new PreparedMigrationExportException();
        }
        state = State.CLOSED;
        ownedSecret.close();
    }

    @Override
    public synchronized String toString() {
        return "PreparedMigrationExport[state=" + state + "]";
    }

    private synchronized void beginStage() {
        if (state != State.READY) {
            throw new PreparedMigrationExportException();
        }
        state = State.STAGING;
    }

    private synchronized void finishStage() {
        state = State.CLOSED;
    }

    private enum State {
        READY,
        STAGING,
        CLOSED
    }

    @FunctionalInterface
    interface BufferFactory {
        BoundedMigrationExportBuffer create(int limit);
    }
}
