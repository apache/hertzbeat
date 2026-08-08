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

package org.apache.hertzbeat.manager.setup.unattended;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.apache.hertzbeat.manager.setup.security.SecureSetupFile;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.springframework.core.env.Environment;

/** Loads unattended passwords exclusively from bounded owner-only files. */
public final class SetupPasswordFileLoader {
    private static final int MAX_PASSWORD_BYTES = 16_384;

    public Password read(Path path) {
        Path normalized = path.toAbsolutePath().normalize();
        byte[] encoded = null;
        char[] decoded = null;
        try {
            if (!SecureSetupFile.isOwnerOnlyRegularFile(normalized)) {
                throw new IllegalStateException("Setup password file is unavailable");
            }
            long size = Files.size(normalized);
            if (size <= 0 || size > MAX_PASSWORD_BYTES) {
                throw new IllegalStateException("Setup password file size is invalid");
            }
            encoded = Files.readAllBytes(normalized);
            CharBuffer buffer = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(encoded));
            decoded = new char[buffer.remaining()];
            buffer.get(decoded);
            int length = withoutLineEnding(decoded);
            if (length == 0) {
                throw new IllegalStateException("Setup password file is empty");
            }
            Password password = new Password(Arrays.copyOf(decoded, length));
            return password;
        } catch (IOException failure) {
            throw new IllegalStateException("Setup password file is unavailable");
        } finally {
            if (encoded != null) {
                Arrays.fill(encoded, (byte) 0);
            }
            if (decoded != null) {
                Arrays.fill(decoded, '\0');
            }
        }
    }

    public static Path requireFilePath(Environment environment, String prefix) {
        if (environment.getProperty(prefix + ".password") != null) {
            throw new IllegalStateException("Plain setup password configuration is forbidden");
        }
        String file = environment.getProperty(prefix + ".password-file");
        if (file == null || file.isBlank()) {
            throw new IllegalStateException("Setup password file is required");
        }
        return Path.of(file);
    }

    private static int withoutLineEnding(char[] value) {
        int length = value.length;
        if (length > 0 && value[length - 1] == '\n') {
            length--;
        }
        if (length > 0 && value[length - 1] == '\r') {
            length--;
        }
        return length;
    }

    /** Scoped password buffer; callers receive copies and must close the owner. */
    public static final class Password implements AutoCloseable {
        private final char[] value;

        private Password(char[] value) {
            this.value = value;
        }

        public char[] copy() {
            return value.clone();
        }

        public SecretValue secretValue() {
            return SecretValue.of(value);
        }

        @Override
        public void close() {
            Arrays.fill(value, '\0');
        }

        @Override
        public String toString() {
            return "Password[redacted]";
        }
    }
}
