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

package org.apache.hertzbeat.common.entity.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.Test;

/**
 * Tests AI conversation serialization.
 */
class ChatConversationTest {

    @Test
    void serializationShouldExcludeStoredSecurityData() {
        ChatConversation conversation = ChatConversation.builder()
            .id(1L)
            .title("Owned conversation")
            .securityData("encrypted-value")
            .build();

        String json = JsonUtil.toJson(conversation);

        assertNotNull(json);
        assertFalse(json.contains("securityData"));
        assertFalse(json.contains("encrypted-value"));
    }
}
