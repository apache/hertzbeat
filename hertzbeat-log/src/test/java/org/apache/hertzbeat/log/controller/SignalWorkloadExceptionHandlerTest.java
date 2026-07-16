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

package org.apache.hertzbeat.log.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.log.service.SignalQueryRejectedException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;

/** Tests retryable overload responses. */
class SignalWorkloadExceptionHandlerTest {

    @Test
    void shouldReturnRetryableTooManyRequests() {
        ResponseEntity<Message<Void>> response = new SignalWorkloadExceptionHandler()
                .handleRejected(new SignalQueryRejectedException("METRICS"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("1", response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
    }

    @Test
    void shouldReturnBadRequestForInvalidAdvancedQuery() {
        ResponseEntity<Message<Void>> response = new SignalWorkloadExceptionHandler()
                .handleInvalidQuery(new IllegalArgumentException("Invalid PromQL query"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void shouldTakePrecedenceOverTheManagerGlobalAdvice() {
        Order order = SignalWorkloadExceptionHandler.class.getAnnotation(Order.class);

        assertNotNull(order);
        assertEquals(Ordered.HIGHEST_PRECEDENCE, order.value());
    }
}
