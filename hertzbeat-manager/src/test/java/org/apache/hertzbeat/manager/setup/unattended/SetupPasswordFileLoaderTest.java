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

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

class SetupPasswordFileLoaderTest {
    @TempDir
    private Path temporaryDirectory;

    @Test
    void readsOnlyOwnerFileAndClearsScopedCopy() throws Exception {
        Path file = temporaryDirectory.resolve("administrator-password");
        Files.write(file, "file-only-secret\n".getBytes(StandardCharsets.UTF_8));
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        SetupPasswordFileLoader loader = new SetupPasswordFileLoader();

        try (SetupPasswordFileLoader.Password password = loader.read(file)) {
            char[] copy = password.copy();
            assertArrayEquals("file-only-secret".toCharArray(), copy);
            java.util.Arrays.fill(copy, '\0');
            assertTrue(password.toString().contains("redacted"));
        }
    }

    @Test
    void rejectsPlainPropertyEvenWhenPasswordFileIsAlsoPresent() {
        MockEnvironment environment = new MockEnvironment().withProperty(
                "hertzbeat.setup.administrator.password", "forbidden")
                .withProperty("hertzbeat.setup.administrator.password-file", "/run/secrets/admin");

        assertThrows(IllegalStateException.class, () -> SetupPasswordFileLoader.requireFilePath(
                environment, "hertzbeat.setup.administrator"));
    }

    @Test
    void rejectsNonOwnerFileAndSymlink() throws Exception {
        Path file = temporaryDirectory.resolve("password");
        Files.writeString(file, "secret");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
        SetupPasswordFileLoader loader = new SetupPasswordFileLoader();
        assertThrows(IllegalStateException.class, () -> loader.read(file));

        Path target = temporaryDirectory.resolve("target");
        Files.writeString(target, "secret");
        Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("rw-------"));
        Path link = temporaryDirectory.resolve("link");
        Files.createSymbolicLink(link, target);
        assertThrows(IllegalStateException.class, () -> loader.read(link));
    }
}
