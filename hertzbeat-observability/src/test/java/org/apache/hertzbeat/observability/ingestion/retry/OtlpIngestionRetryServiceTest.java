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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.observability.ingestion.error.OtlpIngestionBackpressureHeaders;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

class OtlpIngestionRetryServiceTest {

    @Test
    void configuredRetryAttemptsAllowSecondRetryBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(3);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() < 3) {
                throw new ResourceAccessException("connection reset");
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(3, attempts.get());
    }

    @Test
    void singleAttemptConfigurationDoesNotRetryTransientFailure() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(1);
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(ResourceAccessException.class, () -> retryService.execute(() -> {
            attempts.incrementAndGet();
            throw new ResourceAccessException("connection reset");
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void retriesUnavailableGrpcStatusBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw Status.UNAVAILABLE.withDescription("backend temporarily unavailable").asRuntimeException();
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void retriesDeadlineExceededGrpcStatusBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw Status.DEADLINE_EXCEEDED.withDescription("backend write timed out").asRuntimeException();
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void retriesResourceExhaustedGrpcStatusBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw Status.RESOURCE_EXHAUSTED.withDescription("backend throttled").asRuntimeException();
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void honorsRetryAfterSecondsTrailerForRetryableGrpcExceptions() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                Metadata trailers = new Metadata();
                trailers.put(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY, "4");
                throw Status.RESOURCE_EXHAUSTED.withDescription("backend throttled")
                        .asRuntimeException(trailers);
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
        assertEquals(List.of(4_000L), delays);
    }

    @Test
    void ignoresRetryAfterTrailerFromNestedNonRetryableGrpcStatusWhenRetryingTransportFailure() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                Metadata trailers = new Metadata();
                trailers.put(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY, "30");
                throw new ResourceAccessException("connection reset", new IOException(
                        Status.INTERNAL.withDescription("backend failed").asRuntimeException(trailers)));
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
        assertEquals(List.of(25L), delays);
    }

    @Test
    void ignoresRetryAfterTrailerFromNestedGrpcStatusWhenTopLevelRetryableStatusHasNoTrailer() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                Metadata trailers = new Metadata();
                trailers.put(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY, "30");
                StatusRuntimeException nested = Status.RESOURCE_EXHAUSTED
                        .withDescription("old throttle")
                        .asRuntimeException(trailers);
                throw Status.UNAVAILABLE
                        .withDescription("backend unavailable")
                        .withCause(nested)
                        .asRuntimeException();
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
        assertEquals(List.of(25L), delays);
    }

    @Test
    void retriesRequestTimeoutHttpStatusBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw HttpClientErrorException.create(
                        HttpStatus.REQUEST_TIMEOUT, "backend request timeout", null, null, null);
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void retriesTooEarlyHttpStatusBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw HttpClientErrorException.create(
                        HttpStatus.TOO_EARLY, "backend too early", null, null, null);
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void doesNotRetryHttpInternalServerError() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(HttpServerErrorException.class, () -> retryService.execute(() -> {
            attempts.incrementAndGet();
            throw HttpServerErrorException.create(
                    HttpStatus.INTERNAL_SERVER_ERROR, "backend internal error", null, null, null);
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void doesNotRetryNonTransientGrpcStatus() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(io.grpc.StatusRuntimeException.class, () -> retryService.execute(() -> {
            attempts.incrementAndGet();
            throw Status.INVALID_ARGUMENT.withDescription("invalid payload").asRuntimeException();
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void doesNotRetryTopLevelNonRetryableGrpcStatusEvenWhenCauseLooksTransient() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(io.grpc.StatusRuntimeException.class, () -> retryService.execute(() -> {
            attempts.incrementAndGet();
            throw Status.INTERNAL.withDescription("backend failed")
                    .withCause(new ResourceAccessException("connection reset"))
                    .asRuntimeException();
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void retriesNestedGrpcStatusExceptionBeforeSuccess() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                throw new RuntimeException(Status.DEADLINE_EXCEEDED.withDescription("backend write timed out").asException());
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
    }

    @Test
    void doesNotRetryNestedNonTransientGrpcStatusException() {
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2);
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(RuntimeException.class, () -> retryService.execute(() -> {
            attempts.incrementAndGet();
            throw new RuntimeException(Status.INVALID_ARGUMENT.withDescription("invalid payload").asException());
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void waitsConfiguredBackoffBetweenRetryableAttempts() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(3, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() < 3) {
                throw new ResourceAccessException("connection reset");
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(3, attempts.get());
        assertEquals(List.of(25L, 25L), delays);
    }

    @Test
    void honorsRetryAfterSecondsHeaderForRetryableHttpResults() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        ResponseEntity<String> result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.RETRY_AFTER, "2");
                return new ResponseEntity<>("throttled", headers, HttpStatus.TOO_MANY_REQUESTS);
            }
            return ResponseEntity.ok("accepted");
        }, response -> response != null && retryService.isRetryableStatus(response.getStatusCode()));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(2, attempts.get());
        assertEquals(List.of(2_000L), delays);
    }

    @Test
    void capsExcessiveRetryAfterSecondsHeaderForRetryableHttpResults() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        ResponseEntity<String> result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.RETRY_AFTER, "86400");
                return new ResponseEntity<>("throttled", headers, HttpStatus.TOO_MANY_REQUESTS);
            }
            return ResponseEntity.ok("accepted");
        }, response -> response != null && retryService.isRetryableStatus(response.getStatusCode()));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(2, attempts.get());
        assertEquals(List.of(60_000L), delays);
    }

    @Test
    void capsOverflowRetryAfterSecondsHeaderForRetryableHttpResults() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        ResponseEntity<String> result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.RETRY_AFTER, "999999999999999999999999");
                return new ResponseEntity<>("throttled", headers, HttpStatus.TOO_MANY_REQUESTS);
            }
            return ResponseEntity.ok("accepted");
        }, response -> response != null && retryService.isRetryableStatus(response.getStatusCode()));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(2, attempts.get());
        assertEquals(List.of(60_000L), delays);
    }

    @Test
    void honorsRetryAfterSecondsHeaderForRetryableHttpExceptions() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.RETRY_AFTER, "3");
                throw HttpClientErrorException.create(
                        HttpStatus.TOO_MANY_REQUESTS, "backend throttled", headers, null, null);
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
        assertEquals(List.of(3_000L), delays);
    }

    @Test
    void honorsRetryAfterHttpDateHeaderForRetryableHttpExceptions() {
        List<Long> delays = new ArrayList<>();
        OtlpIngestionRetryService retryService = new OtlpIngestionRetryService(2, 25L, delays::add);
        AtomicInteger attempts = new AtomicInteger();

        String result = retryService.execute(() -> {
            if (attempts.incrementAndGet() == 1) {
                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.RETRY_AFTER, DateTimeFormatter.RFC_1123_DATE_TIME.format(
                        ZonedDateTime.now(ZoneOffset.UTC).plusSeconds(5)));
                throw HttpClientErrorException.create(
                        HttpStatus.TOO_MANY_REQUESTS, "backend throttled", headers, null, null);
            }
            return "accepted";
        });

        assertEquals("accepted", result);
        assertEquals(2, attempts.get());
        assertEquals(1, delays.size());
        assertTrue(delays.get(0) >= 1_000L);
    }
}
