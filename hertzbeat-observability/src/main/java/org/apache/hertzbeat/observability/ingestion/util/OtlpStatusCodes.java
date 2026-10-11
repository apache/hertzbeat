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

package org.apache.hertzbeat.observability.ingestion.util;

import io.grpc.Status;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;

/**
 * Canonical status codes shared by ingestion audit storage and RED summaries.
 */
public final class OtlpStatusCodes {
    private static final Set<String> SUPPORTED_STATUS_CODES = Set.of(
            "OK",
            "CANCELLED",
            "UNKNOWN",
            "INVALID_ARGUMENT",
            "DEADLINE_EXCEEDED",
            "NOT_FOUND",
            "ALREADY_EXISTS",
            "PERMISSION_DENIED",
            "RESOURCE_EXHAUSTED",
            "FAILED_PRECONDITION",
            "ABORTED",
            "OUT_OF_RANGE",
            "UNIMPLEMENTED",
            "INTERNAL",
            "UNAVAILABLE",
            "DATA_LOSS",
            "UNAUTHENTICATED"
    );

    private OtlpStatusCodes() {
    }

    public static String normalize(String value) {
        String text = StringUtils.trimToNull(value);
        if (text == null) {
            return null;
        }
        String grpcStatusName = numericGrpcStatusName(text);
        if (grpcStatusName != null) {
            return grpcStatusName;
        }
        if (isNumericStatusCode(text)) {
            return null;
        }
        String normalized = text.replaceAll("[\\s-]+", "_").replaceAll("^_+|_+$", "");
        normalized = StringUtils.trimToNull(normalized) == null ? null : normalized.toUpperCase(Locale.ROOT);
        return normalized != null && SUPPORTED_STATUS_CODES.contains(normalized) ? normalized : null;
    }

    private static String numericGrpcStatusName(String text) {
        String trimmed = StringUtils.trimToEmpty(text);
        if (trimmed.isEmpty()) {
            return null;
        }
        try {
            BigDecimal numericStatus = new BigDecimal(trimmed).stripTrailingZeros();
            if (numericStatus.scale() > 0) {
                return null;
            }
            int codeValue = numericStatus.intValueExact();
            if (codeValue < Status.Code.OK.value() || codeValue > Status.Code.UNAUTHENTICATED.value()) {
                return null;
            }
            return Status.fromCodeValue(codeValue).getCode().name();
        } catch (ArithmeticException | NumberFormatException ignored) {
            return null;
        }
    }

    private static boolean isNumericStatusCode(String text) {
        try {
            new BigDecimal(text);
            return true;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }
}
