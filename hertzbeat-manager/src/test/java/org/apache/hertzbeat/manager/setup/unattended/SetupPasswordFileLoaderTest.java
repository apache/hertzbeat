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
    void rejectsNonOwnerFileAndOutOfRootSymlink() throws Exception {
        Path mount = Files.createDirectory(temporaryDirectory.resolve("mount"));
        Path file = mount.resolve("password");
        Files.writeString(file, "secret");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
        SetupPasswordFileLoader loader = new SetupPasswordFileLoader();
        assertThrows(IllegalStateException.class, () -> loader.read(file));

        Path target = temporaryDirectory.resolve("outside-target");
        Files.writeString(target, "secret");
        Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("rw-------"));
        Path link = mount.resolve("password-link");
        Files.createSymbolicLink(link, target);
        assertThrows(IllegalStateException.class, () -> loader.read(link));
    }

    @Test
    void readsKubernetesStyleInRootSymlinkAndFollowsRotation() throws Exception {
        Path mount = Files.createDirectory(temporaryDirectory.resolve("mount"));
        Path firstVersion = Files.createDirectory(mount.resolve("..2026_08_09_01"));
        Path secondVersion = Files.createDirectory(mount.resolve("..2026_08_09_02"));
        writeOwnerReadOnly(firstVersion.resolve("password"), "first-secret");
        writeOwnerReadOnly(secondVersion.resolve("password"), "second-secret");
        Path dataLink = mount.resolve("..data");
        Files.createSymbolicLink(dataLink, firstVersion.getFileName());
        Path passwordLink = mount.resolve("password");
        Files.createSymbolicLink(passwordLink, Path.of("..data", "password"));

        SetupPasswordFileLoader loader = new SetupPasswordFileLoader();
        try (SetupPasswordFileLoader.Password password = loader.read(passwordLink)) {
            assertArrayEquals("first-secret".toCharArray(), password.copy());
        }

        Files.delete(dataLink);
        Files.createSymbolicLink(dataLink, secondVersion.getFileName());

        try (SetupPasswordFileLoader.Password password = loader.read(passwordLink)) {
            assertArrayEquals("second-secret".toCharArray(), password.copy());
        }
    }

    private static void writeOwnerReadOnly(Path target, String value) throws Exception {
        Files.writeString(target, value);
        Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("r--------"));
    }
}
