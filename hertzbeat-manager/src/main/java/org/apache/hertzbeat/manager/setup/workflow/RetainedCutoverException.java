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

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Locale;
import java.util.Objects;

/** Cause-free retained cutover failure safe for a later workflow boundary. */
final class RetainedCutoverException extends RuntimeException {

    private final RetainedCutoverErrorCode code;

    RetainedCutoverException(RetainedCutoverErrorCode code) {
        super("Retained cutover failed: "
                + Objects.requireNonNull(code, "code").name().toLowerCase(Locale.ROOT));
        this.code = code;
    }

    RetainedCutoverErrorCode code() {
        return code;
    }
}
