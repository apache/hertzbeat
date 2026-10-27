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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.hertzbeat.common.util.AesUtil;
import org.apache.hertzbeat.common.util.JsonUtil;

/** Private protocol sidecar: encrypted with the existing application key, never included in public JSON. */
public final class AgentModelPartsCodec {
    private static final int MAX_PART_BYTES = 24000;

    private AgentModelPartsCodec() { }

    public static String seal(AgentModelParts value) {
        if (value == null) {
            return null;
        }
        String json = JsonUtil.toJson(value);
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_PART_BYTES) {
            throw AgentRuntimeModelException.nonRetryable("Provider message parts exceed the replay budget", null);
        }
        String ciphertext = AesUtil.aesEncode(json);
        if (ciphertext == null || !AesUtil.isCiphertext(ciphertext)) {
            throw AgentRuntimeModelException.nonRetryable("Provider message parts could not be sealed", null);
        }
        return ciphertext;
    }

    public static AgentModelParts open(String ciphertext, String binding) {
        try {
            AgentModelParts value = JsonUtil.fromJson(AesUtil.aesDecode(ciphertext), AgentModelParts.class);
            if (value == null || !value.binding().equals(binding)) {
                throw new IllegalArgumentException("Model binding differs");
            }
            return value;
        } catch (RuntimeException invalid) {
            throw AgentRuntimeModelException.nonRetryable(
                    "Saved model parts belong to another provider/protocol or cannot be read; start a new investigation", null);
        }
    }

    /** Remove private replay material from the HTTP transcript view without modifying stored history. */
    public static String publicJson(String payload) {
        if (payload == null || !payload.contains("\"modelPartsCiphertext\"")) {
            return payload;
        }
        Map<String, Object> view = new LinkedHashMap<>(JsonUtil.fromJson(payload, Map.class));
        view.remove("modelPartsCiphertext");
        return JsonUtil.toJson(view);
    }

    public static String storageJson(TranscriptMessage message) {
        String publicJson = JsonUtil.toJson(message);
        if (message.getModelPartsCiphertext() == null) {
            return publicJson;
        }
        Map<String, Object> stored = new LinkedHashMap<>(JsonUtil.fromJson(publicJson, Map.class));
        stored.put("modelPartsCiphertext", message.getModelPartsCiphertext());
        return JsonUtil.toJson(stored);
    }
}
