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

package org.apache.hertzbeat.manager.setup.security;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.ReadableByteChannel;
import java.util.Arrays;

/** Reads into caller-owned secret storage and clears it before propagating any failure. */
final class SecureFileChannelReader {

    private SecureFileChannelReader() {
    }

    static void readAndValidate(ReadableByteChannel channel, byte[] destination, Validation validation)
            throws IOException {
        try {
            readFully(channel, destination);
            validation.verify();
        } catch (IOException | RuntimeException | Error failure) {
            Arrays.fill(destination, (byte) 0);
            throw failure;
        }
    }

    private static void readFully(ReadableByteChannel channel, byte[] destination) throws IOException {
        ByteBuffer buffer = ByteBuffer.wrap(destination);
        while (buffer.hasRemaining()) {
            int read = channel.read(buffer);
            if (read <= 0) {
                throw new IOException("Setup file changed while it was read");
            }
        }
    }

    @FunctionalInterface
    interface Validation {
        void verify() throws IOException;
    }
}
