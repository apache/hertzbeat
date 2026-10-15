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

package org.apache.hertzbeat.manager.setup.workflow;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Bounded Greptime HTTP health/authentication adapter. */
public final class GreptimeHttpConnectionProbe implements TelemetryConnectionProbe {
    private final Duration timeout;
    private final HttpClient client;

    public GreptimeHttpConnectionProbe(Duration timeout) {
        this(timeout, HttpClient.newBuilder().connectTimeout(timeout).build());
    }

    GreptimeHttpConnectionProbe(Duration timeout, HttpClient client) {
        this.timeout = timeout;
        this.client = client;
    }

    @Override
    public Optional<SetupErrorCode> probe(TelemetryConnectionProbe.Request configuration) {
        try {
            String endpoint = configuration.httpEndpoint().replaceAll("/+$", "") + "/v1/sql?db="
                    + URLEncoder.encode(configuration.database(), StandardCharsets.UTF_8);
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(endpoint))
                    .timeout(timeout).header("Accept", "application/json")
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("sql=SELECT%201", StandardCharsets.US_ASCII));
            if (configuration.username().isPresent()) {
                request.header("Authorization", basicAuthorization(
                        configuration.username().orElseThrow(), configuration.password().orElseThrow()));
            }
            int status = client.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
            return status >= 200 && status < 300
                    ? Optional.empty() : Optional.of(SetupErrorCode.TELEMETRY_CONNECTION_FAILED);
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            return Optional.of(SetupErrorCode.TELEMETRY_CONNECTION_FAILED);
        } catch (Exception failure) {
            return Optional.of(SetupErrorCode.TELEMETRY_CONNECTION_FAILED);
        }
    }

    private static String basicAuthorization(String username, SecretValue password) {
        byte[] usernameBytes = username.getBytes(StandardCharsets.UTF_8);
        char[] passwordCharacters = password.copy();
        ByteBuffer passwordBytes = StandardCharsets.UTF_8.encode(CharBuffer.wrap(passwordCharacters));
        byte[] credentials = new byte[usernameBytes.length + 1 + passwordBytes.remaining()];
        byte[] encoded = null;
        try {
            System.arraycopy(usernameBytes, 0, credentials, 0, usernameBytes.length);
            credentials[usernameBytes.length] = ':';
            passwordBytes.get(credentials, usernameBytes.length + 1, passwordBytes.remaining());
            encoded = Base64.getEncoder().encode(credentials);
            // HttpRequest headers require a String; retain only the encoded header at this JDK boundary.
            return "Basic " + new String(encoded, StandardCharsets.US_ASCII);
        } finally {
            Arrays.fill(usernameBytes, (byte) 0);
            Arrays.fill(passwordCharacters, '\0');
            if (passwordBytes.hasArray()) {
                Arrays.fill(passwordBytes.array(), (byte) 0);
            }
            Arrays.fill(credentials, (byte) 0);
            if (encoded != null) {
                Arrays.fill(encoded, (byte) 0);
            }
        }
    }
}
