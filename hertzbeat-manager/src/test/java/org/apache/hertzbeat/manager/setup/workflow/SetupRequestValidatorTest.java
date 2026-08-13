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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.PublicAccessConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationSection;
import org.junit.jupiter.api.Test;

class SetupRequestValidatorTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-08-08T00:00:00Z"), ZoneOffset.UTC);
    private final SetupRequestValidator validator = new SetupRequestValidator(clock);

    @Test
    void metadataKindMustMatchJdbcSchemeWithoutReturningConnectionDetails() {
        var response = validator.validate(new ValidateRequest(ValidationSection.METADATA_DATABASE,
                new MetadataDatabaseConfiguration(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:mysql://db/hertzbeat", "user", "password"), null, null, null));

        assertFalse(response.valid());
        assertEquals(SetupErrorCode.METADATA_KIND_UNSUPPORTED, response.errorCode());
        assertEquals(clock.instant(), response.observedAt());
        assertFalse(response.toString().contains("jdbc:mysql"));
    }

    @Test
    void publicAccessValidatorProducesStablePlaintextWarningForPublicHttp() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(
                        "http://monitor.example.test", null, null), null));

        assertTrue(response.valid());
        assertEquals(java.util.List.of(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT), response.warnings());
    }

    @Test
    void internalHttpAddressIsAllowedWithoutPublicPlaintextWarning() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration("http://192.168.10.5:1157", null, null), null));

        assertTrue(response.valid());
        assertTrue(response.warnings().isEmpty());
    }

    @Test
    void internalIpv6HttpAddressesDoNotProducePublicPlaintextWarning() {
        for (String address : java.util.List.of(
                "http://[::1]:1157", "http://[fd00::1]:1157",
                "http://[::ffff:192.168.10.5]:1157", "http://[::ffff:127.0.0.1]:1157",
                "http://[0:0:0:0::ffff:192.168.10.5]:1157", "http://[::ffff:c0a8:0a05]:1157")) {
            var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                    null, null, new PublicAccessConfiguration(address, null, null), null));

            assertTrue(response.valid());
            assertTrue(response.warnings().isEmpty());
        }
    }

    @Test
    void publicBaseUrlMustBeAnExplicitAbsoluteHttpOrHttpsAddress() {
        var relative = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration("/from-browser-origin", null, null), null));
        var https = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration("https://hertzbeat.example.test", null, null), null));

        assertFalse(relative.valid());
        assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, relative.errorCode());
        assertTrue(https.valid());
        assertTrue(https.warnings().isEmpty());
    }

    @Test
    void serverGrpcEndpointMustBeAnExplicitHttpUrl() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(null, null, "collector.example.test:4317"), null));

        assertFalse(response.valid());
        assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
    }

    @Test
    void serverEndpointsRejectPortsOutsideTheTcpRange() {
        for (PublicAccessConfiguration configuration : java.util.List.of(
                new PublicAccessConfiguration("http://hertzbeat.example.test:0", null, null),
                new PublicAccessConfiguration("http://hertzbeat.example.test:70000", null, null),
                new PublicAccessConfiguration(null, "http://collector.example.test:0", null),
                new PublicAccessConfiguration(null, "http://collector.example.test:70000", null),
                new PublicAccessConfiguration(null, null, "http://collector.example.test:0"),
                new PublicAccessConfiguration(null, null, "http://collector.example.test:70000"))) {
            var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                    null, null, configuration, null));

            assertFalse(response.valid());
            assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
        }
    }

    @Test
    void advertisedAddressesRejectWildcardHosts() {
        for (PublicAccessConfiguration configuration : java.util.List.of(
                new PublicAccessConfiguration("http://0.0.0.0:1157", null, null),
                new PublicAccessConfiguration("http://[::]:1157", null, null),
                new PublicAccessConfiguration("http://[::ffff:0.0.0.0]:1157", null, null),
                new PublicAccessConfiguration("http://[::ffff:0:0]:1157", null, null),
                new PublicAccessConfiguration(null, "http://0.0.0.0:4318", null),
                new PublicAccessConfiguration(null, null, "http://[0:0:0:0:0:0:0:0]:4317"))) {
            var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                    null, null, configuration, null));

            assertFalse(response.valid());
            assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
        }
    }

    @Test
    void advertisedIpv6AddressesRejectZoneIdentifiers() {
        for (PublicAccessConfiguration configuration : java.util.List.of(
                new PublicAccessConfiguration("http://[::%25eth0]:4318", null, null),
                new PublicAccessConfiguration("http://[::%eth0]:4318", null, null),
                new PublicAccessConfiguration(null, "http://[fe80::1%25eth0]:4318", null),
                new PublicAccessConfiguration(null, "http://[fe80::1%eth0]:4318", null))) {
            var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                    null, null, configuration, null));

            assertFalse(response.valid());
            assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
        }
    }

    @Test
    void publicIpv4MappedIpv6AddressStillProducesPlaintextWarning() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration("http://[::ffff:0808:0808]:1157", null, null), null));

        assertTrue(response.valid());
        assertEquals(java.util.List.of(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT), response.warnings());
    }

    @Test
    void serverEndpointRejectsUrlCredentialsAndQuery() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(null,
                        "https://user:secret@collector.example.test:4318?token=secret", null), null));

        assertFalse(response.valid());
        assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
    }

    @Test
    void grpcOnlyPlaintextEndpointProducesWarning() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(
                        null, null, "http://collector.example.test:4317"), null));

        assertTrue(response.valid());
        assertEquals(java.util.List.of(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT), response.warnings());
    }

    @Test
    void publicAccessSectionRequiresAtLeastOneExplicitAddress() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(" ", null, null), null));

        assertFalse(response.valid());
        assertEquals(SetupErrorCode.PUBLIC_ADDRESS_INVALID, response.errorCode());
    }

    @Test
    void endpointWhitespaceIsNormalizedBeforeValidationAndWarnings() {
        var response = validator.validate(new ValidateRequest(ValidationSection.PUBLIC_ACCESS,
                null, null, new PublicAccessConfiguration(null,
                        "  https://collector.example.test:4318/otlp  ",
                        "  http://collector.example.test:4317  "), null));

        assertTrue(response.valid());
        assertEquals(java.util.List.of(SetupWarningCode.PUBLIC_ADDRESS_PLAINTEXT), response.warnings());
    }
}
