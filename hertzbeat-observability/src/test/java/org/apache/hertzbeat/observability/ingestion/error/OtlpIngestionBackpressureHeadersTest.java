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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class OtlpIngestionBackpressureHeadersTest {

    @Test
    void capsExcessiveRetryAfterSecondsWhenCreatingGrpcTrailers() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, "86400");

        StatusRuntimeException exception = OtlpIngestionBackpressureHeaders.statusRuntimeException(
                Status.RESOURCE_EXHAUSTED, "backend throttled", headers);

        assertEquals("60", exception.getTrailers()
                .get(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY));
        assertEquals("60", OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    @Test
    void normalizesExpiredRetryAfterHttpDateToZeroWhenCreatingGrpcTrailers() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, DateTimeFormatter.RFC_1123_DATE_TIME.format(
                ZonedDateTime.now(ZoneOffset.UTC).minusSeconds(5)));

        StatusRuntimeException exception = OtlpIngestionBackpressureHeaders.statusRuntimeException(
                Status.RESOURCE_EXHAUSTED, "backend throttled", headers);

        assertEquals("0", exception.getTrailers()
                .get(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY));
        assertEquals("0", OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    @Test
    void normalizesFutureRetryAfterHttpDateToBoundedSecondsWhenCreatingGrpcTrailers() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, DateTimeFormatter.RFC_1123_DATE_TIME.format(
                ZonedDateTime.now(ZoneOffset.UTC).plusSeconds(30)));

        StatusRuntimeException exception = OtlpIngestionBackpressureHeaders.statusRuntimeException(
                Status.RESOURCE_EXHAUSTED, "backend throttled", headers);

        String retryAfter = exception.getTrailers()
                .get(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY);
        assertTrue(retryAfter.matches("\\d+"));
        long retryAfterSeconds = Long.parseLong(retryAfter);
        assertTrue(retryAfterSeconds > 0L && retryAfterSeconds <= 30L);
        assertEquals(retryAfter, OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    @Test
    void dropsRetryAfterForNonBackpressureGrpcStatus() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, "30");

        StatusRuntimeException exception = OtlpIngestionBackpressureHeaders.statusRuntimeException(
                Status.INTERNAL, "backend failed", headers);

        assertNull(exception.getTrailers());
        assertNull(OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }

    @Test
    void ignoresRetryAfterTrailersOnNonBackpressureGrpcException() {
        io.grpc.Metadata trailers = new io.grpc.Metadata();
        trailers.put(OtlpIngestionBackpressureHeaders.RETRY_AFTER_TRAILER_KEY, "30");

        StatusRuntimeException exception = Status.INTERNAL
                .withDescription("backend failed")
                .asRuntimeException(trailers);

        assertNull(OtlpIngestionBackpressureHeaders.retryAfter(exception));
    }
}
