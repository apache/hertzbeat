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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import org.junit.jupiter.api.Test;

class SecureFileChannelReaderTest {

    @Test
    void wipesDestinationWhenChannelReadFails() {
        byte[] destination = new byte[12];
        ReadableByteChannel channel = new ReadableByteChannel() {
            private boolean firstRead = true;

            @Override
            public int read(ByteBuffer target) throws IOException {
                if (!firstRead) {
                    throw new IOException("injected read failure");
                }
                firstRead = false;
                target.put("secret".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return 6;
            }

            @Override
            public boolean isOpen() {
                return true;
            }

            @Override
            public void close() {
            }
        };

        assertThrows(IOException.class,
                () -> SecureFileChannelReader.readAndValidate(channel, destination, () -> { }));

        assertArrayEquals(new byte[destination.length], destination);
    }

    @Test
    void wipesDestinationOnShortEndOfFile() {
        byte[] destination = new byte[12];
        ReadableByteChannel channel = Channels.newChannel(new ByteArrayInputStream(new byte[] {1, 2, 3}));

        assertThrows(IOException.class,
                () -> SecureFileChannelReader.readAndValidate(channel, destination, () -> { }));

        assertArrayEquals(new byte[destination.length], destination);
    }

    @Test
    void failsAndWipesInsteadOfRetryingZeroByteRead() {
        byte[] destination = new byte[6];
        ReadableByteChannel channel = new ReadableByteChannel() {
            private boolean firstRead = true;

            @Override
            public int read(ByteBuffer target) {
                if (firstRead) {
                    firstRead = false;
                    return 0;
                }
                target.put("secret".getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return 6;
            }

            @Override
            public boolean isOpen() {
                return true;
            }

            @Override
            public void close() {
            }
        };

        assertThrows(IOException.class,
                () -> SecureFileChannelReader.readAndValidate(channel, destination, () -> { }));

        assertArrayEquals(new byte[destination.length], destination);
    }

    @Test
    void wipesDestinationWhenPostReadValidationFails() {
        byte[] destination = new byte[6];
        ReadableByteChannel channel = Channels.newChannel(new ByteArrayInputStream("secret".getBytes(
                java.nio.charset.StandardCharsets.UTF_8)));

        assertThrows(IOException.class, () -> SecureFileChannelReader.readAndValidate(
                channel, destination, () -> {
                    throw new IOException("injected validation failure");
                }));

        assertArrayEquals(new byte[destination.length], destination);
    }
}
