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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.FileAttribute;
import java.nio.file.attribute.UserPrincipal;
import java.util.List;
import org.junit.jupiter.api.Test;

class OwnerOnlyFilePermissionsTest {

    @Test
    void aclCreationAttributeStartsWithNoAccessInsteadOfGrantingParentOwner() {
        FileAttribute<?> attribute = OwnerOnlyFilePermissions.aclCreationAttribute();

        assertEquals("acl:acl", attribute.name());
        @SuppressWarnings("unchecked")
        List<AclEntry> entries = (List<AclEntry>) attribute.value();
        assertTrue(entries.isEmpty());
    }

    @Test
    void readableAclRequiresOwnerReadAndRejectsNonOwnerDataMutationGrants() {
        UserPrincipal owner = () -> "owner";
        UserPrincipal other = () -> "other";
        AclEntry ownerRead = allow(owner, AclEntryPermission.READ_DATA);

        assertTrue(OwnerOnlyFilePermissions.isReadableOwnerOnlyAcl(List.of(ownerRead), owner));
        assertFalse(OwnerOnlyFilePermissions.isReadableOwnerOnlyAcl(List.of(
                ownerRead,
                allow(other, AclEntryPermission.WRITE_DATA),
                allow(other, AclEntryPermission.APPEND_DATA)), owner));
    }

    @Test
    void readableAclRejectsEveryNonOwnerAllowEntry() {
        UserPrincipal owner = () -> "owner";
        UserPrincipal other = () -> "other";
        AclEntry ownerRead = allow(owner, AclEntryPermission.READ_DATA);

        for (AclEntryPermission permission : AclEntryPermission.values()) {
            assertFalse(OwnerOnlyFilePermissions.isReadableOwnerOnlyAcl(
                    List.of(ownerRead, allow(other, permission)), owner), permission::name);
        }
    }

    private static AclEntry allow(UserPrincipal principal, AclEntryPermission... permissions) {
        return AclEntry.newBuilder().setType(AclEntryType.ALLOW)
                .setPrincipal(principal).setPermissions(permissions).build();
    }
}
