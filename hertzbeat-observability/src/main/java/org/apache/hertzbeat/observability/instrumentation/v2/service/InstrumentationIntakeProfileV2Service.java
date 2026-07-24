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

package org.apache.hertzbeat.observability.instrumentation.v2.service;

import java.util.Comparator;
import java.util.List;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.DiscoveryStatus;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfile;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfilesResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.store.InstrumentationIntakeProfileStore;
import org.springframework.stereotype.Service;

/** Discovers and resolves only server-advertised intake profiles. */
@Service
public class InstrumentationIntakeProfileV2Service {

    private final InstrumentationIntakeProfileStore store;

    public InstrumentationIntakeProfileV2Service(InstrumentationIntakeProfileStore store) {
        this.store = store;
    }

    public IntakeProfilesResponse profiles() {
        List<IntakeProfile> profiles;
        try {
            profiles = store.profiles().stream().sorted(Comparator
                    .comparing((IntakeProfile profile) -> profile.availability() != Availability.AVAILABLE)
                    .thenComparing(profile -> profile.kind() != IntakeKind.SERVER)
                    .thenComparing(IntakeProfile::id)).toList();
        } catch (RuntimeException exception) {
            return new IntakeProfilesResponse(
                    2,
                    DiscoveryStatus.UNAVAILABLE,
                    org.apache.hertzbeat.observability.instrumentation.v2.api
                            .InstrumentationIntakeProfileV2.ErrorCode.DISCOVERY_UNAVAILABLE,
                    null,
                    List.of());
        }
        String defaultId = profiles.stream()
                .filter(profile -> profile.availability() == Availability.AVAILABLE)
                .map(IntakeProfile::id)
                .findFirst()
                .orElse(null);
        DiscoveryStatus status = profiles.isEmpty() ? DiscoveryStatus.UNCONFIGURED : DiscoveryStatus.AVAILABLE;
        return new IntakeProfilesResponse(2, status, null, defaultId, profiles);
    }

    public IntakeProfile requireAvailable(String profileId) {
        if (profileId == null || !profileId.matches("[A-Za-z0-9][A-Za-z0-9._:-]{0,127}")) {
            throw new InstrumentationV2RequestException(ErrorCode.CONTEXT_INVALID);
        }
        IntakeProfile profile = profiles().profiles().stream()
                .filter(candidate -> candidate.id().equals(profileId))
                .findFirst()
                .orElseThrow(() -> new InstrumentationV2RequestException(ErrorCode.INTAKE_PROFILE_NOT_FOUND));
        if (profile.availability() != Availability.AVAILABLE) {
            throw new InstrumentationV2RequestException(ErrorCode.INTAKE_PROFILE_UNAVAILABLE);
        }
        return profile;
    }
}
