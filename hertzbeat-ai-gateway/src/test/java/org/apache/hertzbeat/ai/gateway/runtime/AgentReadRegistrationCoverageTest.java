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

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;

/**
 * Adding a native READ tool requires an explicit observation contract or a recorded unsupported
 * disposition.
 */
class AgentReadRegistrationCoverageTest {
    @Test
    void everyRegisteredNativeReadHasAnExplicitDisposition() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter((reader, factory) -> true);
        int reads = 0;
        var missing = new java.util.ArrayList<String>();
        var productionSource = org.apache.hertzbeat.ai.gateway.tool.core.AgentToolConfiguration.class
                .getProtectionDomain().getCodeSource().getLocation();
        for (var candidate : scanner.findCandidateComponents("org.apache.hertzbeat.ai.gateway.tool")) {
            var type = Class.forName(candidate.getBeanClassName(), false, getClass().getClassLoader());
            if (!productionSource.equals(type.getProtectionDomain().getCodeSource().getLocation())) { continue; }
            for (var method : org.springframework.util.ReflectionUtils.getUniqueDeclaredMethods(type)) {
                Tool tool = method.getAnnotation(Tool.class);
                AgentToolPolicy policy = method.getAnnotation(AgentToolPolicy.class);
                if (tool == null || policy == null || policy.risk() != AgentToolRisk.READ) {
                    continue;
                }
                reads++;
                if (AgentReadContractCatalog.disposition(tool.name()) == null) { missing.add(tool.name()); }
            }
        }
        assertTrue(missing.isEmpty(), "Unclassified native READ registrations: " + missing);
        assertTrue(reads >= 100, "The scan must include the production tool services");
    }

    @Test
    void unrecordedReadCannotSilentlyAcquireClassification() {
        assertNull(AgentReadContractCatalog.disposition("logs.new_unreviewed_read"));
        org.junit.jupiter.api.Assertions.assertEquals("planning-only-not-platform-evidence",
                AgentReadContractCatalog.disposition("monitor.website_exclusions"));
        org.junit.jupiter.api.Assertions.assertEquals("typed-native-observation", AgentReadContractCatalog.disposition("metrics.otlp_inventory"));
        assertTrue(
                AgentReadContractCatalog.disposition("traces.structure_analysis")
                        .startsWith("explicitly-unsupported"));
    }
}
