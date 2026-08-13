/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.util.Locale;

/** Rejects file-store types whose locks cannot prove local process exclusion. */
final class StandaloneFileStorePolicy {

    private StandaloneFileStorePolicy() {
    }

    static boolean supportsProcessOwnership(String fileStoreType) {
        String type = fileStoreType.toLowerCase(Locale.ROOT);
        return type.equals("apfs") || type.equals("hfs") || type.equals("hfs+")
                || type.equals("xfs") || type.equals("btrfs") || type.equals("zfs")
                || type.equals("ntfs") || type.equals("tmpfs") || type.equals("overlay")
                || type.startsWith("ext");
    }
}
