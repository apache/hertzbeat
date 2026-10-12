/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.api;

/** Stable, non-sensitive v2 request failure. */
public class InstrumentationV2RequestException extends IllegalArgumentException {

    private final ErrorCode errorCode;

    public InstrumentationV2RequestException(ErrorCode errorCode) {
        super(errorCode.code());
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    /** Stable failure codes returned in the ordinary Message envelope. */
    public enum ErrorCode {
        SCHEMA_UNSUPPORTED("instrumentation_v2_schema_unsupported"),
        SELECTION_INVALID("instrumentation_v2_selection_invalid"),
        CONTEXT_INVALID("instrumentation_v2_context_invalid"),
        INTAKE_PROFILE_NOT_FOUND("instrumentation_v2_intake_profile_not_found"),
        INTAKE_PROFILE_UNAVAILABLE("instrumentation_v2_intake_profile_unavailable");

        private final String code;

        ErrorCode(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }
}
