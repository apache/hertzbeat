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

package org.apache.hertzbeat.collector.runtime.otel;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/** Applies a smaller official file-storage limit only to an isolated test candidate. */
final class OtelRuntimeConfiguredCapacityRenderer extends OtelRuntimeConfigRenderer {

    private static final String PRODUCTION_LIMIT = "    max_size: 67108864\n";
    private final int capacityBytes;

    OtelRuntimeConfiguredCapacityRenderer(int capacityBytes) {
        if (capacityBytes < 64 * 1024) {
            throw new IllegalArgumentException("test file-storage capacity must be at least 64 KiB");
        }
        this.capacityBytes = capacityBytes;
    }

    @Override
    Path renderCandidate(OtelRuntimeProperties properties) throws IOException {
        Path candidate = super.renderCandidate(properties);
        try {
            String rendered = Files.readString(candidate, StandardCharsets.UTF_8);
            int first = rendered.indexOf(PRODUCTION_LIMIT);
            if (first < 0 || first != rendered.lastIndexOf(PRODUCTION_LIMIT)) {
                throw new IOException("expected exactly one production file-storage limit in candidate");
            }
            String configured = rendered.substring(0, first)
                    + "    max_size: " + capacityBytes + '\n'
                    + rendered.substring(first + PRODUCTION_LIMIT.length());
            Files.writeString(candidate, configured, StandardCharsets.UTF_8,
                    StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
            try (FileChannel channel = FileChannel.open(candidate, StandardOpenOption.WRITE)) {
                channel.force(true);
            }
            setOwnerOnlyWhenSupported(candidate);
            return candidate;
        } catch (IOException | RuntimeException failure) {
            Files.deleteIfExists(candidate);
            throw failure;
        }
    }
}
