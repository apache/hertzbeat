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

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import org.apache.hertzbeat.common.support.TrustedAuditActorContext;
import org.junit.jupiter.api.Test;

class JpaAuditorConfigTest {

    @Test
    void runtimeAttributionOverridesAmbientHttpAndThenRestoresIt() {
        SubjectSum subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("http-operator");
        SurenessContextHolder.bindSubject(subject);
        JpaAuditorConfig auditor = new JpaAuditorConfig();
        try {
            assertEquals("http-operator", auditor.getCurrentAuditor().orElseThrow());
            try (var scope = TrustedAuditActorContext.bind("agent-operator")) {
                assertEquals("agent-operator", auditor.getCurrentAuditor().orElseThrow());
            }
            try (var scope = TrustedAuditActorContext.bind("system:schedule")) {
                assertEquals("system:schedule", auditor.getCurrentAuditor().orElseThrow());
            }
            try (var scope = TrustedAuditActorContext.bind(null)) {
                assertTrue(auditor.getCurrentAuditor().isEmpty());
            }
            assertEquals("http-operator", auditor.getCurrentAuditor().orElseThrow());
        } finally {
            SurenessContextHolder.clear();
        }
        assertTrue(auditor.getCurrentAuditor().isEmpty());
    }
}
