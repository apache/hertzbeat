/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Checksum-protected, secret-free codec for one exact migration candidate identity. */
final class MigrationCandidateManifestCodec {

    private static final String HEADER = "hertzbeat-managed-migration-candidate=1\n";
    private static final String CHECKSUM_PREFIX = "sha256=";

    byte[] encode(MigrationCandidateManifest manifest) {
        String body = HEADER
                + "operationId=" + manifest.operationId() + "\n"
                + "candidateGeneration=" + manifest.candidateGeneration() + "\n"
                + "baseGeneration=" + manifest.baseGeneration() + "\n"
                + "targetIdentityHash=" + manifest.targetIdentityHash() + "\n";
        return (body + CHECKSUM_PREFIX + checksum(body) + "\n").getBytes(StandardCharsets.US_ASCII);
    }

    MigrationCandidateManifest decode(byte[] encoded) throws IOException {
        String document = new String(encoded, StandardCharsets.US_ASCII);
        int checksumStart = document.lastIndexOf(CHECKSUM_PREFIX);
        if (checksumStart < 0 || !document.endsWith("\n")) {
            throw invalid();
        }
        String body = document.substring(0, checksumStart);
        String expected = document.substring(checksumStart + CHECKSUM_PREFIX.length(), document.length() - 1);
        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
                checksum(body).getBytes(StandardCharsets.US_ASCII))) {
            throw invalid();
        }
        String[] lines = body.split("\n", -1);
        if (lines.length != 6 || !(lines[0] + "\n").equals(HEADER)) {
            throw invalid();
        }
        MigrationCandidateManifest manifest = new MigrationCandidateManifest(
                value(lines[1], "operationId="), value(lines[2], "candidateGeneration="),
                value(lines[3], "baseGeneration="), value(lines[4], "targetIdentityHash="));
        manifest.validate();
        return manifest;
    }

    private static String value(String line, String prefix) throws IOException {
        if (!line.startsWith(prefix)) {
            throw invalid();
        }
        return line.substring(prefix.length());
    }

    private static String checksum(String content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private static IOException invalid() {
        return new IOException("Managed migration manifest is invalid");
    }
}
