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

package org.apache.hertzbeat.alert.service.impl;

import java.util.regex.Pattern;
import org.apache.hertzbeat.common.support.exception.SendMessageException;

/**
 * Builds bounded SMS failures without copying provider-controlled response
 * bodies, request URLs, or transport exception messages.
 */
final class SmsFailureMessages {

    private static final Pattern SAFE_PROVIDER_CODE = Pattern.compile("[-A-Za-z0-9_.]{1,64}");
    private static final String UNKNOWN_PROVIDER_CODE = "UNKNOWN_PROVIDER_ERROR";

    private SmsFailureMessages() {
    }

    static SendMessageException requestFailed(String providerLabel) {
        return new SendMessageException(providerLabel + " request failed");
    }

    static SendMessageException httpStatus(String providerLabel, int statusCode) {
        return new SendMessageException(
                providerLabel + " request failed with HTTP status " + statusCode);
    }

    static SendMessageException providerCode(String providerLabel, String code) {
        String safeCode = code != null && SAFE_PROVIDER_CODE.matcher(code).matches()
                ? code
                : UNKNOWN_PROVIDER_CODE;
        return new SendMessageException(
                providerLabel + " request failed (code: " + safeCode + ")");
    }

    static SendMessageException invalidResponse(String providerLabel) {
        return new SendMessageException(providerLabel + " provider returned an invalid response");
    }
}
