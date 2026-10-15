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
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus.FailureCode;

/** Reads only a bounded Runtime diagnostic tail and emits stable categories or redacted summaries. */
public class OtelRuntimeDiagnosticsReader {

    private static final int MAXIMUM_TAIL_BYTES = 64 * 1024;
    private static final int MAXIMUM_STATUS_MESSAGE_LENGTH = 512;
    private static final Pattern AUTHORIZATION = Pattern.compile(
            "(?i)authorization\\s*[:=]\\s*(?:bearer\\s+)?[^\\s,;}]+"
    );
    private static final Pattern BEARER = Pattern.compile("(?i)bearer\\s+[^\\s,;}]+");
    private static final Pattern CERTIFICATE = Pattern.compile(
            "-----BEGIN [^-]+-----.*?-----END [^-]+-----", Pattern.DOTALL);
    private final OtelRuntimeFailureClassifier classifier;

    public OtelRuntimeDiagnosticsReader(OtelRuntimeFailureClassifier classifier) {
        this.classifier = classifier;
    }

    public FailureCode latestFailure(OtelRuntimeProperties properties) {
        Path logFile = OtelRuntimeConfigRenderer.resolve(properties.getHome(), properties.getLog());
        String tail = tail(logFile);
        if (tail.isBlank()) {
            return FailureCode.NONE;
        }
        String[] lines = tail.split("\\R");
        for (int index = lines.length - 1; index >= 0; index--) {
            FailureCode code = classifier.classify(lines[index]);
            if (code != FailureCode.NONE && code != FailureCode.UNKNOWN) {
                return code;
            }
        }
        return FailureCode.NONE;
    }

    public String sanitize(String diagnostic, OtelRuntimeProperties properties) {
        if (diagnostic == null || diagnostic.isBlank()) {
            return "";
        }
        String withoutCertificate = CERTIFICATE.matcher(diagnostic).replaceAll("[REDACTED_CERTIFICATE]");
        String sanitized = withoutCertificate.lines().findFirst().orElse("");
        sanitized = AUTHORIZATION.matcher(sanitized).replaceAll("[REDACTED_CREDENTIAL]");
        sanitized = BEARER.matcher(sanitized).replaceAll("[REDACTED_CREDENTIAL]");
        for (String secret : secrets(properties)) {
            sanitized = sanitized.replace(secret, "[REDACTED]");
        }
        return sanitized.length() <= MAXIMUM_STATUS_MESSAGE_LENGTH
                ? sanitized
                : sanitized.substring(0, MAXIMUM_STATUS_MESSAGE_LENGTH);
    }

    private List<String> secrets(OtelRuntimeProperties properties) {
        List<String> secrets = new ArrayList<>();
        addSecret(secrets, properties.getToken());
        addSecret(secrets, properties.getOtlpGatewayBearerToken());
        if (properties.getPrometheusHeaderSecrets() != null) {
            properties.getPrometheusHeaderSecrets().values().forEach(secret -> addSecret(secrets, secret));
        }
        return secrets;
    }

    private void addSecret(List<String> secrets, String secret) {
        if (secret != null && secret.length() >= 4) {
            secrets.add(secret);
        }
    }

    private String tail(Path logFile) {
        if (!Files.isRegularFile(logFile)) {
            return "";
        }
        try (FileChannel channel = FileChannel.open(logFile, StandardOpenOption.READ)) {
            long size = channel.size();
            int length = (int) Math.min(size, MAXIMUM_TAIL_BYTES);
            ByteBuffer buffer = ByteBuffer.allocate(length);
            channel.position(size - length);
            while (buffer.hasRemaining() && channel.read(buffer) >= 0) {
                // Continue until the bounded tail is filled or EOF is reached.
            }
            return new String(buffer.array(), 0, buffer.position(), StandardCharsets.UTF_8);
        } catch (IOException error) {
            return "";
        }
    }
}
