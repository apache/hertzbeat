/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.io.IOException;
import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader.ServerAvailability;
import org.apache.hertzbeat.warehouse.store.history.tsdb.WarehouseStorageProbeException;
import org.springframework.util.StringUtils;

/** Bounded, cached reachability probe for Greptime's read-only HTTP health endpoint. */
final class GreptimeServerAvailabilityProbe {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(1);
    private static final Duration CACHE_TTL = Duration.ofSeconds(5);

    private final String httpEndpoint;
    private final Clock clock;
    private final Duration cacheTtl;
    private final Transport transport;

    private volatile CachedOutcome cachedOutcome;

    GreptimeServerAvailabilityProbe(String httpEndpoint) {
        this(httpEndpoint, Clock.systemUTC(), CACHE_TTL, new JdkHttpTransport());
    }

    GreptimeServerAvailabilityProbe(String httpEndpoint, Clock clock, Duration cacheTtl, Transport transport) {
        this.httpEndpoint = httpEndpoint;
        this.clock = clock;
        this.cacheTtl = cacheTtl;
        this.transport = transport;
    }

    ServerAvailability current() {
        Instant now = clock.instant();
        CachedOutcome observed = cachedOutcome;
        if (isFresh(observed, now)) {
            return resolve(observed.outcome());
        }
        synchronized (this) {
            now = clock.instant();
            observed = cachedOutcome;
            if (!isFresh(observed, now)) {
                observed = new CachedOutcome(probe(), now.plus(cacheTtl));
                cachedOutcome = observed;
            }
        }
        return resolve(observed.outcome());
    }

    private boolean isFresh(CachedOutcome observed, Instant now) {
        return observed != null && now.isBefore(observed.expiresAt());
    }

    private Outcome probe() {
        try {
            int statusCode = transport.status(healthUri(), REQUEST_TIMEOUT);
            if (statusCode >= 200 && statusCode < 300) {
                return Outcome.AVAILABLE;
            }
            if (statusCode >= 500 && statusCode < 600) {
                return Outcome.UNAVAILABLE;
            }
            return Outcome.QUERY_FAILED;
        } catch (IOException exception) {
            return isUnavailable(exception) ? Outcome.UNAVAILABLE : Outcome.QUERY_FAILED;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Outcome.QUERY_FAILED;
        } catch (RuntimeException exception) {
            return Outcome.QUERY_FAILED;
        }
    }

    private URI healthUri() {
        String endpoint = StringUtils.trimWhitespace(httpEndpoint);
        if (!StringUtils.hasText(endpoint)) {
            throw new IllegalArgumentException("Greptime HTTP endpoint is missing");
        }
        int end = endpoint.length();
        while (end > 0 && endpoint.charAt(end - 1) == '/') {
            end--;
        }
        URI uri = URI.create(endpoint.substring(0, end) + "/health");
        String scheme = uri.getScheme();
        if (!("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) || uri.getHost() == null) {
            throw new IllegalArgumentException("Greptime HTTP endpoint is invalid");
        }
        return uri;
    }

    private boolean isUnavailable(Throwable exception) {
        for (Throwable current = exception; current != null; current = current.getCause()) {
            if (current instanceof HttpTimeoutException
                    || current instanceof ConnectException
                    || current instanceof NoRouteToHostException
                    || current instanceof UnknownHostException) {
                return true;
            }
        }
        return false;
    }

    private ServerAvailability resolve(Outcome outcome) {
        return switch (outcome) {
            case AVAILABLE -> ServerAvailability.AVAILABLE;
            case UNAVAILABLE -> ServerAvailability.UNAVAILABLE;
            case QUERY_FAILED -> throw new WarehouseStorageProbeException();
        };
    }

    @FunctionalInterface
    interface Transport {

        int status(URI uri, Duration timeout) throws IOException, InterruptedException;
    }

    private record CachedOutcome(Outcome outcome, Instant expiresAt) {
    }

    private enum Outcome {
        AVAILABLE,
        UNAVAILABLE,
        QUERY_FAILED
    }

    private static final class JdkHttpTransport implements Transport {

        private final HttpClient client = HttpClient.newBuilder()
                .connectTimeout(REQUEST_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        @Override
        public int status(URI uri, Duration timeout) throws IOException, InterruptedException {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(timeout)
                    .GET()
                    .build();
            return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        }
    }
}
