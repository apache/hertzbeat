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
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.util.List;
import java.util.Set;

/** Cross-platform owner-only permission policy for setup files. */
final class OwnerOnlyFilePermissions {
    private static final Set<PosixFilePermission> POSIX_PERMISSIONS =
            PosixFilePermissions.fromString("rw-------");
    private static final Set<PosixFilePermission> POSIX_READ_ONLY =
            PosixFilePermissions.fromString("r--------");
    private static final Set<AclEntryPermission> ACL_PERMISSIONS = Set.of(
            AclEntryPermission.READ_DATA,
            AclEntryPermission.WRITE_DATA,
            AclEntryPermission.APPEND_DATA,
            AclEntryPermission.READ_ATTRIBUTES,
            AclEntryPermission.READ_ACL,
            AclEntryPermission.SYNCHRONIZE);

    private OwnerOnlyFilePermissions() {
    }

    static FileAttribute<?>[] creationAttributes(Path parent) throws IOException {
        if (Files.getFileStore(parent).supportsFileAttributeView(PosixFileAttributeView.class)) {
            return new FileAttribute<?>[] {PosixFilePermissions.asFileAttribute(POSIX_PERMISSIONS)};
        }
        if (aclView(parent) != null) {
            return new FileAttribute<?>[] {aclCreationAttribute()};
        }
        throw new IOException("Owner-only file permissions are unavailable");
    }

    static FileAttribute<List<AclEntry>> aclCreationAttribute() {
        return new FileAttribute<>() {
            @Override
            public String name() {
                return "acl:acl";
            }

            @Override
            public List<AclEntry> value() {
                return List.of();
            }
        };
    }

    static void enforce(Path target) throws IOException {
        PosixFileAttributeView posix = posixView(target);
        if (posix != null) {
            posix.setPermissions(POSIX_PERMISSIONS);
            if (!posix.readAttributes().permissions().equals(POSIX_PERMISSIONS)) {
                throw verificationFailure();
            }
            return;
        }
        enforceAcl(target);
    }

    static boolean isReadableOwnerOnly(Path target) throws IOException {
        PosixFileAttributeView posix = posixView(target);
        if (posix != null) {
            Set<PosixFilePermission> permissions = posix.readAttributes().permissions();
            return permissions.equals(POSIX_READ_ONLY) || permissions.equals(POSIX_PERMISSIONS);
        }
        AclFileAttributeView acl = aclView(target);
        return acl != null && isReadableOwnerOnlyAcl(
                acl.getAcl(), Files.getOwner(target, LinkOption.NOFOLLOW_LINKS));
    }

    private static void enforceAcl(Path target) throws IOException {
        AclFileAttributeView acl = aclView(target);
        if (acl == null) {
            throw new IOException("Owner-only file permissions are unavailable");
        }
        UserPrincipal owner = Files.getOwner(target, LinkOption.NOFOLLOW_LINKS);
        acl.setAcl(List.of(ownerEntry(owner)));
        if (!hasOwnerOnlyAcl(acl.getAcl(), owner)) {
            throw verificationFailure();
        }
    }

    private static boolean hasOwnerOnlyAcl(List<AclEntry> entries, UserPrincipal owner) {
        return entries.size() == 1
                && entries.getFirst().type() == AclEntryType.ALLOW
                && entries.getFirst().principal().equals(owner)
                && entries.getFirst().permissions().equals(ACL_PERMISSIONS);
    }

    private static AclEntry ownerEntry(UserPrincipal owner) {
        return AclEntry.newBuilder().setType(AclEntryType.ALLOW)
                .setPrincipal(owner).setPermissions(ACL_PERMISSIONS).build();
    }

    static boolean isReadableOwnerOnlyAcl(List<AclEntry> entries, UserPrincipal owner) {
        boolean ownerCanRead = false;
        for (AclEntry entry : entries) {
            if (entry.type() != AclEntryType.ALLOW) {
                continue;
            }
            if (!entry.principal().equals(owner)) {
                return false;
            }
            ownerCanRead |= entry.permissions().contains(AclEntryPermission.READ_DATA);
        }
        return ownerCanRead;
    }

    private static PosixFileAttributeView posixView(Path target) {
        return Files.getFileAttributeView(target, PosixFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
    }

    private static AclFileAttributeView aclView(Path target) {
        return Files.getFileAttributeView(target, AclFileAttributeView.class, LinkOption.NOFOLLOW_LINKS);
    }

    private static IOException verificationFailure() {
        return new IOException("Owner-only file permissions could not be verified");
    }
}
