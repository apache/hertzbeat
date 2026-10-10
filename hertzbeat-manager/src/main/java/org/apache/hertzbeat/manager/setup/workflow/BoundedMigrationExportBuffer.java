/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;

/** Bounded in-memory staging buffer whose backing bytes have explicit ownership. */
final class BoundedMigrationExportBuffer extends OutputStream implements AutoCloseable {

    private static final int INITIAL_CAPACITY = 1024;

    private final int limit;
    private final PayloadFactory payloadFactory;
    private byte[] bytes;
    private int size;
    private boolean transferred;
    private boolean closed;

    BoundedMigrationExportBuffer(int limit) {
        this(limit, StagedMigrationExport::new);
    }

    BoundedMigrationExportBuffer(int limit, PayloadFactory payloadFactory) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit");
        }
        this.limit = limit;
        this.payloadFactory = Objects.requireNonNull(payloadFactory, "payloadFactory");
        bytes = new byte[Math.min(limit, INITIAL_CAPACITY)];
    }

    @Override
    public void write(int value) throws IOException {
        requireCapacity(1);
        bytes[size++] = (byte) value;
    }

    @Override
    public void write(byte[] source, int offset, int length) throws IOException {
        Objects.checkFromIndexSize(offset, length, source.length);
        requireCapacity(length);
        System.arraycopy(source, offset, bytes, size, length);
        size += length;
    }

    StagedMigrationExport finish(ExportResponse metadata) {
        if (transferred || closed) {
            throw new PreparedMigrationExportException();
        }
        try {
            StagedMigrationExport staged = payloadFactory.create(metadata, bytes, size);
            transferred = true;
            bytes = new byte[0];
            return staged;
        } catch (RuntimeException | Error failure) {
            close();
            throw failure;
        }
    }

    @Override
    public void close() {
        if (closed) {
            return;
        }
        Arrays.fill(bytes, (byte) 0);
        bytes = new byte[0];
        size = 0;
        closed = true;
    }

    private void requireCapacity(int additional) throws IOException {
        if (transferred || closed || additional > limit - size) {
            throw new IOException("Prepared migration export exceeded its size limit");
        }
        int required = size + additional;
        if (required <= bytes.length) {
            return;
        }
        int nextCapacity = Math.min(limit, Math.max(required, bytes.length * 2));
        byte[] next = Arrays.copyOf(bytes, nextCapacity);
        Arrays.fill(bytes, (byte) 0);
        bytes = next;
    }

    @FunctionalInterface
    interface PayloadFactory {
        StagedMigrationExport create(ExportResponse metadata, byte[] bytes, int size);
    }
}
