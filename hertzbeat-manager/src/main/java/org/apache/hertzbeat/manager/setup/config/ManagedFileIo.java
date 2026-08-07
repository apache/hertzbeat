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

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.file.Path;

/** Narrow I/O seams used by the durable file adapter and its failure-path tests. */
final class ManagedFileIo {

    private ManagedFileIo() {
    }

    interface Publisher {

        void publish(Path target, byte[] content, boolean ownerOnly) throws IOException;

        void remove(Path target) throws IOException;
    }

    @FunctionalInterface
    interface Reader {

        byte[] read(Path path) throws IOException;
    }

    interface Operations {

        void atomicReplace(Path source, Path target) throws IOException;

        void forceDirectory(Path directory) throws IOException;
    }
}
