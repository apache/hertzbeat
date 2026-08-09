/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
