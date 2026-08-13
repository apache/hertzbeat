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

import java.util.Objects;
import java.util.Optional;

/** Secret-free result of reading a candidate or last-known-good snapshot. */
record CandidateRead<T>(CandidateState state, Optional<T> value, Optional<String> generation) {

    public CandidateRead {
        Objects.requireNonNull(state, "state");
        Objects.requireNonNull(value, "value");
        Objects.requireNonNull(generation, "generation");
        if ((state == CandidateState.VALID) != value.isPresent()
                || value.isPresent() != generation.isPresent()) {
            throw new IllegalArgumentException("Only a valid read may contain a value and generation");
        }
        generation.ifPresent(ManagedDocumentCodec.Integrity::requireValidGeneration);
    }

    public static <T> CandidateRead<T> valid(T value, String generation) {
        return new CandidateRead<>(CandidateState.VALID, Optional.of(value), Optional.of(generation));
    }

    public static <T> CandidateRead<T> missing() {
        return nonValid(CandidateState.MISSING);
    }

    public static <T> CandidateRead<T> invalid() {
        return nonValid(CandidateState.INVALID);
    }

    public static <T> CandidateRead<T> unreadable() {
        return nonValid(CandidateState.UNREADABLE);
    }

    public static <T> CandidateRead<T> corrupt() {
        return nonValid(CandidateState.CORRUPT);
    }

    private static <T> CandidateRead<T> nonValid(CandidateState state) {
        return new CandidateRead<>(state, Optional.empty(), Optional.empty());
    }
}
