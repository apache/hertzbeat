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

package org.apache.hertzbeat.observability.ingestion.error;

import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;

/**
 * Carries backend backpressure hints across OTLP HTTP and gRPC boundaries.
 */
public final class OtlpIngestionBackpressureHeaders {

    private static final long MAX_RETRY_AFTER_SECONDS = 60L;

    public static final Metadata.Key<String> RETRY_AFTER_TRAILER_KEY =
            Metadata.Key.of("retry-after", Metadata.ASCII_STRING_MARSHALLER);

    private OtlpIngestionBackpressureHeaders() {
    }

    public static StatusRuntimeException statusRuntimeException(Status status, String description,
                                                                 HttpHeaders responseHeaders) {
        Status describedStatus = status.withDescription(description);
        Metadata trailers = isBackpressureStatus(status) ? retryAfterTrailers(responseHeaders) : null;
        return trailers == null ? describedStatus.asRuntimeException() : describedStatus.asRuntimeException(trailers);
    }

    public static String retryAfter(StatusRuntimeException exception) {
        if (exception == null || !isBackpressureStatus(exception.getStatus())) {
            return null;
        }
        return retryAfter(exception.getTrailers());
    }

    private static String retryAfter(Metadata trailers) {
        return trailers == null ? null : legalRetryAfter(trailers.get(RETRY_AFTER_TRAILER_KEY));
    }

    private static Metadata retryAfterTrailers(HttpHeaders responseHeaders) {
        String retryAfter = retryAfter(responseHeaders);
        if (retryAfter == null) {
            return null;
        }
        Metadata trailers = new Metadata();
        trailers.put(RETRY_AFTER_TRAILER_KEY, retryAfter);
        return trailers;
    }

    private static boolean isBackpressureStatus(Status status) {
        if (status == null) {
            return false;
        }
        Status.Code code = status.getCode();
        return Status.Code.RESOURCE_EXHAUSTED == code
                || Status.Code.UNAVAILABLE == code
                || Status.Code.DEADLINE_EXCEEDED == code;
    }

    private static String retryAfter(HttpHeaders responseHeaders) {
        if (responseHeaders == null) {
            return null;
        }
        List<String> values = responseHeaders.get(HttpHeaders.RETRY_AFTER);
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.stream()
                .map(OtlpIngestionBackpressureHeaders::legalRetryAfter)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private static String legalRetryAfter(String value) {
        String trimmed = StringUtils.trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        if (trimmed.matches("\\d+")) {
            return cappedRetryAfterSeconds(trimmed);
        }
        try {
            Instant retryAt = ZonedDateTime.parse(trimmed, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
            long retryAfterSeconds = Duration.between(Instant.now(), retryAt).getSeconds();
            if (retryAfterSeconds <= 0L) {
                return "0";
            }
            return String.valueOf(Math.min(retryAfterSeconds, MAX_RETRY_AFTER_SECONDS));
        } catch (DateTimeException ignored) {
            return null;
        }
    }

    private static String cappedRetryAfterSeconds(String value) {
        try {
            long seconds = Long.parseLong(value);
            return String.valueOf(Math.min(seconds, MAX_RETRY_AFTER_SECONDS));
        } catch (NumberFormatException ignored) {
            return String.valueOf(MAX_RETRY_AFTER_SECONDS);
        }
    }
}
