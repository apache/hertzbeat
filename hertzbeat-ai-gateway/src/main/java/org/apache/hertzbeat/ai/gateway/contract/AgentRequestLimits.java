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

package org.apache.hertzbeat.ai.gateway.contract;

/** Bounded user requests permit complete fifty-item manifests without unlimited model input. */
public final class AgentRequestLimits {
    public static final int MAX_MESSAGE_CHARS = 32768;
    public static final int MAX_MESSAGE_UTF8_BYTES = 49152;
    public static final int MAX_HTTP_BYTES = 262144;

    private AgentRequestLimits() {}

    public static boolean validMessageBytes(String message) {
        return message == null
                || message.getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                        <= MAX_MESSAGE_UTF8_BYTES;
    }
}
