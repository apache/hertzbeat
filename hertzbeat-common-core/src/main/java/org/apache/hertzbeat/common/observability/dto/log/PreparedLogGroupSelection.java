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

package org.apache.hertzbeat.common.observability.dto.log;

import java.util.List;

/** Immutable, storage-verified scalar candidates for the managed OTLP pipeline. */
public record PreparedLogGroupSelection(LogGroupSelection selection, List<Target> targets) {
    public PreparedLogGroupSelection {
        if (selection == null || targets == null || targets.size() != selection.groups().size()) {
            throw new IllegalArgumentException("Inconsistent prepared log selection");
        }
        targets = List.copyOf(targets);
        for (int i = 0; i < targets.size(); i++) {
            if (!selection.groups().get(i).equals(targets.get(i).key())) {
                throw new IllegalArgumentException("Prepared log selection order differs");
            }
        }
    }

    /** Original strings always remain matchable; numeric candidates are optional and type-specific. */
    public record Target(LogGroupSelection.Key key, Long int64, Long float64Bits) {
        public Target {
            if (key == null || (!"value".equals(key.kind()) && (int64 != null || float64Bits != null))
                    || (float64Bits != null && Double.isNaN(Double.longBitsToDouble(float64Bits)))) {
                throw new IllegalArgumentException("Invalid prepared log target");
            }
        }
    }
}
