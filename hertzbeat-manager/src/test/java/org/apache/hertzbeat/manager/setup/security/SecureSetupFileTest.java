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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeFalse;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.UserPrincipal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SecureSetupFileTest {
    @TempDir
    private Path temporaryDirectory;

    @Test
    void createsWithActualOwnerOnlyAclOnAclOnlyFileStore() throws Exception {
        FileStore fileStore = Files.getFileStore(temporaryDirectory);
        assumeFalse(fileStore.supportsFileAttributeView(PosixFileAttributeView.class));
        assumeTrue(fileStore.supportsFileAttributeView(AclFileAttributeView.class));
        Path target = temporaryDirectory.resolve("secret");
        byte[] content = "secret-content".getBytes(StandardCharsets.UTF_8);

        SecureSetupFile.create(temporaryDirectory, target, content);

        UserPrincipal actualOwner = Files.getOwner(target, LinkOption.NOFOLLOW_LINKS);
        AclFileAttributeView aclView = Files.getFileAttributeView(
                target, AclFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
        assertNotNull(aclView);
        AclEntry expectedOwnerEntry = AclEntry.newBuilder().setType(AclEntryType.ALLOW)
                .setPrincipal(actualOwner).setPermissions(Set.of(
                        AclEntryPermission.READ_DATA,
                        AclEntryPermission.WRITE_DATA,
                        AclEntryPermission.APPEND_DATA,
                        AclEntryPermission.READ_ATTRIBUTES,
                        AclEntryPermission.READ_ACL,
                        AclEntryPermission.SYNCHRONIZE))
                .build();
        assertEquals(List.of(expectedOwnerEntry), aclView.getAcl());
        assertArrayEquals(content, Files.readAllBytes(target));
    }

    @Test
    void createRejectsSymlinkInAncestorPath() throws Exception {
        Path realDirectory = temporaryDirectory.resolve("real");
        Files.createDirectory(realDirectory);
        Path linkedDirectory = temporaryDirectory.resolve("linked");
        Files.createSymbolicLink(linkedDirectory, realDirectory);

        assertThrows(java.io.IOException.class, () -> SecureSetupFile.create(
                temporaryDirectory,
                linkedDirectory.resolve("nested").resolve("secret"),
                "secret-content".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void createRejectsSymlinkAncestorWhenAllDescendantDirectoriesExist() throws Exception {
        Path trustedRoot = Files.createDirectory(temporaryDirectory.resolve("trusted"));
        Path outside = Files.createDirectory(temporaryDirectory.resolve("outside"));
        Files.createDirectory(outside.resolve("nested"));
        Path linkedDirectory = trustedRoot.resolve("linked");
        Files.createSymbolicLink(linkedDirectory, outside);

        assertThrows(java.io.IOException.class, () -> SecureSetupFile.create(
                trustedRoot,
                linkedDirectory.resolve("nested").resolve("secret"),
                "secret-content".getBytes(StandardCharsets.UTF_8)));
    }
}
