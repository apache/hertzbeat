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

package org.apache.hertzbeat.manager.setup.api;

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.springframework.http.HttpStatus;

/** Typed internal setup failure; its message is deliberately just the stable wire code. */
public final class SetupApiException extends IllegalStateException {
    private final SetupErrorCode errorCode;
    private final HttpStatus status;

    public SetupApiException(SetupErrorCode errorCode, HttpStatus status) {
        super(errorCode.value());
        this.errorCode = errorCode;
        this.status = status;
    }

    public SetupErrorCode errorCode() {
        return errorCode;
    }

    public HttpStatus status() {
        return status;
    }
}
