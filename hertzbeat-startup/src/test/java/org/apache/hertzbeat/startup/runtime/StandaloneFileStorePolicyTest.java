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

package org.apache.hertzbeat.startup.runtime;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class StandaloneFileStorePolicyTest {

    @ParameterizedTest
    @ValueSource(strings = {"apfs", "hfs+", "ext4", "xfs", "btrfs", "zfs", "ntfs", "tmpfs", "overlay"})
    void acceptsLocalFileStores(String type) {
        assertThat(StandaloneFileStorePolicy.supportsProcessOwnership(type)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"nfs", "nfs4", "smbfs", "cifs", "sshfs", "afs", "9p", "fuse", "custom"})
    void rejectsNetworkFileStores(String type) {
        assertThat(StandaloneFileStorePolicy.supportsProcessOwnership(type)).isFalse();
    }
}
