/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

/** Exact start-inclusive and end-exclusive investigation window. */
public record InvestigationWindow(long start, long end) {

    public static final long MAX_WINDOW_MILLIS = 24L * 60L * 60L * 1000L;

    public InvestigationWindow {
        if (start <= 0L || end <= start || end - start > MAX_WINDOW_MILLIS) {
            throw new IllegalArgumentException("Investigation window is invalid");
        }
    }
}
