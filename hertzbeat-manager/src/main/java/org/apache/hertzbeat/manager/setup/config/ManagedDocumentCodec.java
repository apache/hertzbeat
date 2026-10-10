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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

interface ManagedDocumentCodec<T> {

    /** Returns a caller-owned document buffer that the caller must clear after synchronous use. */
    byte[] encode(T value, String generation);

    /** Decodes synchronously and must not modify, retain, or asynchronously use the input buffer. */
    Decoded<T> decode(byte[] content) throws DocumentException;

    record Decoded<T>(T value, String generation) {

        public Decoded {
            Objects.requireNonNull(value, "value");
            Integrity.requireValidGeneration(generation);
        }
    }

    final class DocumentException extends Exception {

        private final CandidateState state;

        private DocumentException(CandidateState state) {
            super("Managed configuration is " + state.name().toLowerCase(Locale.ROOT));
            this.state = state;
        }

        static DocumentException invalid() {
            return new DocumentException(CandidateState.INVALID);
        }

        static DocumentException corrupt() {
            return new DocumentException(CandidateState.CORRUPT);
        }

        CandidateState state() {
            return state;
        }
    }

    final class Integrity {

        static final String FORMAT_HEADER = "# hertzbeat-managed-format: 1\n";
        static final String GENERATION_PREFIX = "# hertzbeat-managed-generation: ";
        static final String CHECKSUM_PREFIX = "# hertzbeat-managed-sha256: ";
        private static final Pattern GENERATION = Pattern.compile("[A-Za-z0-9-]{1,64}");

        private Integrity() {
        }

        static byte[] envelope(String body, String generation) {
            requireValidGeneration(generation);
            String protectedContent = generation + "\n" + body;
            String document = FORMAT_HEADER + GENERATION_PREFIX + generation + "\n"
                    + CHECKSUM_PREFIX + checksum(protectedContent) + "\n" + body;
            return document.getBytes(StandardCharsets.UTF_8);
        }

        static VerifiedBody extract(byte[] content) throws DocumentException {
            String document = new String(content, StandardCharsets.UTF_8);
            if (!document.startsWith(FORMAT_HEADER + GENERATION_PREFIX)) {
                throw DocumentException.corrupt();
            }
            int generationStart = FORMAT_HEADER.length() + GENERATION_PREFIX.length();
            int generationEnd = document.indexOf('\n', generationStart);
            if (generationEnd < 0) {
                throw DocumentException.corrupt();
            }
            String generation = document.substring(generationStart, generationEnd);
            if (!GENERATION.matcher(generation).matches()) {
                throw DocumentException.corrupt();
            }
            int checksumPrefixStart = generationEnd + 1;
            if (!document.startsWith(CHECKSUM_PREFIX, checksumPrefixStart)) {
                throw DocumentException.corrupt();
            }
            int checksumStart = checksumPrefixStart + CHECKSUM_PREFIX.length();
            int checksumEnd = document.indexOf('\n', checksumStart);
            if (checksumEnd < 0) {
                throw DocumentException.corrupt();
            }
            return new VerifiedBody(generation, document.substring(checksumStart, checksumEnd),
                    document.substring(checksumEnd + 1));
        }

        static void verify(VerifiedBody body) throws DocumentException {
            String protectedContent = body.generation() + "\n" + body.content();
            if (!MessageDigest.isEqual(
                    body.expectedChecksum().getBytes(StandardCharsets.US_ASCII),
                    checksum(protectedContent).getBytes(StandardCharsets.US_ASCII))) {
                throw DocumentException.corrupt();
            }
        }

        static void requireValidGeneration(String generation) {
            Objects.requireNonNull(generation, "generation");
            if (!GENERATION.matcher(generation).matches()) {
                throw new IllegalArgumentException("Invalid managed configuration generation");
            }
        }

        static String literalForSpring(String value) {
            return value.replace("${", "\\${");
        }

        private static String checksum(String content) {
            try {
                return HexFormat.of().formatHex(
                        MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8)));
            } catch (NoSuchAlgorithmException impossible) {
                throw new IllegalStateException("SHA-256 is unavailable", impossible);
            }
        }

        record VerifiedBody(String generation, String expectedChecksum, String content) {
        }
    }
}
