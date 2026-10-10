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

package org.apache.hertzbeat.observability.ingestion.retry;

import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusException;
import io.grpc.StatusRuntimeException;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.function.LongConsumer;
import java.util.function.Predicate;
import java.util.function.Supplier;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;

/**
 * Shared retry boundary for transient OTLP backend writes.
 */
@Service
public class OtlpIngestionRetryService {

    private static final int DEFAULT_MAX_ATTEMPTS = 2;
    private static final long DEFAULT_MAX_RETRY_AFTER_MILLIS = 60_000L;

    private final int maxAttempts;
    private final long backoffMillis;
    private final long maxRetryAfterMillis;
    private final LongConsumer backoffSleeper;

    public OtlpIngestionRetryService() {
        this(DEFAULT_MAX_ATTEMPTS, 0L, OtlpIngestionRetryService::sleep);
    }

    @Autowired
    public OtlpIngestionRetryService(
            @Value("${hertzbeat.otlp.ingestion.retry.max-attempts:2}") int maxAttempts,
            @Value("${hertzbeat.otlp.ingestion.retry.backoff-millis:0}") long backoffMillis,
            @Value("${hertzbeat.otlp.ingestion.retry.max-retry-after-millis:60000}") long maxRetryAfterMillis) {
        this(maxAttempts, backoffMillis, maxRetryAfterMillis, OtlpIngestionRetryService::sleep);
    }

    public OtlpIngestionRetryService(int maxAttempts) {
        this(maxAttempts, 0L, OtlpIngestionRetryService::sleep);
    }

    OtlpIngestionRetryService(int maxAttempts, long backoffMillis, LongConsumer backoffSleeper) {
        this(maxAttempts, backoffMillis, DEFAULT_MAX_RETRY_AFTER_MILLIS, backoffSleeper);
    }

    OtlpIngestionRetryService(int maxAttempts, long backoffMillis, long maxRetryAfterMillis,
                              LongConsumer backoffSleeper) {
        this.maxAttempts = Math.max(1, maxAttempts);
        this.backoffMillis = Math.max(0L, backoffMillis);
        this.maxRetryAfterMillis = Math.max(0L, maxRetryAfterMillis);
        this.backoffSleeper = backoffSleeper == null ? OtlpIngestionRetryService::sleep : backoffSleeper;
    }

    public <T> T execute(Supplier<T> operation) {
        return execute(operation, result -> false);
    }

    public <T> T execute(Supplier<T> operation, Predicate<T> retryableResult) {
        RuntimeException lastFailure = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                T result = operation.get();
                if (attempt < maxAttempts && retryableResult != null && retryableResult.test(result)) {
                    waitBeforeRetry(result);
                    continue;
                }
                return result;
            } catch (RuntimeException ex) {
                lastFailure = ex;
                if (attempt >= maxAttempts || !isRetryable(ex)) {
                    throw ex;
                }
                waitBeforeRetry(ex);
            }
        }
        throw lastFailure;
    }

    private boolean isRetryable(RuntimeException exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof ResourceAccessException) {
                return true;
            }
            if (current instanceof HttpStatusCodeException statusException) {
                return isRetryableStatus(statusException.getStatusCode());
            }
            if (current instanceof StatusRuntimeException statusException) {
                return isRetryableGrpcStatus(statusException.getStatus().getCode());
            }
            if (current instanceof StatusException statusException) {
                return isRetryableGrpcStatus(statusException.getStatus().getCode());
            }
            current = current.getCause();
        }
        return false;
    }

    public boolean isRetryableStatus(HttpStatusCode statusCode) {
        if (statusCode == null) {
            return false;
        }
        return switch (statusCode.value()) {
            case 408, 425, 429, 502, 503, 504 -> true;
            default -> false;
        };
    }

    private boolean isRetryableGrpcStatus(Status.Code statusCode) {
        return Status.Code.UNAVAILABLE == statusCode
                || Status.Code.DEADLINE_EXCEEDED == statusCode
                || Status.Code.RESOURCE_EXHAUSTED == statusCode;
    }

    private void waitBeforeRetry(Object retryableResult) {
        waitBeforeRetry(retryAfterMillis(retryableResult));
    }

    private void waitBeforeRetry() {
        waitBeforeRetry(null);
    }

    private void waitBeforeRetry(Long retryAfterMillis) {
        long delayMillis = retryAfterMillis == null
                ? backoffMillis
                : Math.min(Math.max(0L, retryAfterMillis), maxRetryAfterMillis);
        if (delayMillis > 0L) {
            backoffSleeper.accept(delayMillis);
        }
    }

    private Long retryAfterMillis(Object retryableResult) {
        if (retryableResult instanceof ResponseEntity<?> responseEntity) {
            return retryAfterMillis(responseEntity.getHeaders());
        }
        if (retryableResult instanceof Throwable throwable) {
            return retryAfterMillis(throwable);
        }
        return null;
    }

    private Long retryAfterMillis(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof HttpStatusCodeException statusException) {
                return isRetryableStatus(statusException.getStatusCode())
                        ? retryAfterMillis(statusException.getResponseHeaders())
                        : null;
            }
            if (current instanceof StatusRuntimeException statusException) {
                return isRetryableGrpcStatus(statusException.getStatus().getCode())
                        ? retryAfterMillis(statusException.getTrailers())
                        : null;
            }
            if (current instanceof StatusException statusException) {
                return isRetryableGrpcStatus(statusException.getStatus().getCode())
                        ? retryAfterMillis(statusException.getTrailers())
                        : null;
            }
            current = current.getCause();
        }
        return null;
    }

    private Long retryAfterMillis(Metadata trailers) {
        if (trailers == null) {
            return null;
        }
        return retryAfterHeaderMillis(trailers.get(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY));
    }

    private Long retryAfterMillis(HttpHeaders headers) {
        if (headers == null) {
            return null;
        }
        List<String> values = headers.get(HttpHeaders.RETRY_AFTER);
        if (values == null) {
            return null;
        }
        for (String value : values) {
            Long delayMillis = retryAfterHeaderMillis(value);
            if (delayMillis != null) {
                return delayMillis;
            }
        }
        return null;
    }

    private Long retryAfterHeaderMillis(String value) {
        Long delayMillis = retryAfterSecondsMillis(value);
        if (delayMillis != null) {
            return delayMillis;
        }
        return retryAfterDateMillis(value);
    }

    private Long retryAfterSecondsMillis(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (!trimmed.matches("\\d+")) {
            return null;
        }
        try {
            long seconds = Long.parseLong(trimmed);
            if (seconds > Long.MAX_VALUE / 1000L) {
                return Long.MAX_VALUE;
            }
            return seconds * 1000L;
        } catch (NumberFormatException ignored) {
            return Long.MAX_VALUE;
        }
    }

    private Long retryAfterDateMillis(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            Instant retryAt = ZonedDateTime.parse(trimmed, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
            return Math.max(0L, Duration.between(Instant.now(), retryAt).toMillis());
        } catch (DateTimeException | ArithmeticException ignored) {
            return null;
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting to retry OTLP ingestion.", ex);
        }
    }
}
