/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Set;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigOptions;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigRequest;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreConfigResponse;
import org.apache.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ObjectStoreConfigMapperTest {

    private final ObjectStoreConfigMapper mapper = new ObjectStoreConfigMapper();

    @Test
    void readRedactsBothObsCredentials() {
        ObjectStoreDTO.ObsConfig options = obs("access-sentinel", "secret-sentinel");

        ObjectStoreConfigResponse response =
                mapper.toResponse(new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, options));

        assertEquals(Set.of("accessKey", "secretKey"), response.configuredSecrets());
        assertEquals("bucket", response.config().bucketName());
        assertFalse(response.toString().contains("access-sentinel"));
        assertFalse(response.toString().contains("secret-sentinel"));
    }

    @Test
    void omittedCredentialsPreserveExistingObsSecrets() {
        ObjectStoreConfigRequest request = obsRequest(null, null);
        ObjectStoreDTO.ObsConfig previous = obs("stored-access", "stored-secret");

        ObjectStoreDTO<ObjectStoreDTO.ObsConfig> merged =
                mapper.toConfig(request, new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, previous));

        assertEquals("stored-access", merged.getConfig().getAccessKey());
        assertEquals("stored-secret", merged.getConfig().getSecretKey());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "KEEP", "keep", "KeEp", "MASK", "mask", "__KEEP__", "__keep__",
        "<masked>", "<MASKED>", "[masked]", "[MASKED]",
        "<redacted>", "<REDACTED>", "[redacted]", "[REDACTED]",
        "****", "********", "••••", "••••••"
    })
    void rejectsNormalizedLegacySecretSentinels(String sentinel) {
        ObjectStoreConfigRequest request = obsRequest(sentinel, null);

        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(
                request, new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obs("stored-access", "stored-secret"))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"replacement", "KEEP", "__KEEP__", "<masked>", "[redacted]", "****", "••••"})
    void clearAndSuppliedSecretAlwaysRejectAsAmbiguous(String supplied) {
        ObjectStoreConfigRequest request = obsRequest(supplied, null);
        request.setClearSecrets(Set.of("accessKey"));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(
                request, new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obs("stored-access", "stored-secret"))));
        assertEquals("Ambiguous object store secret update", error.getMessage());
    }

    @Test
    void acceptsValuesBelowRepeatedMaskBoundary() {
        for (String value : Set.of("***", "•••")) {
            ObjectStoreDTO<ObjectStoreDTO.ObsConfig> config = mapper.toConfig(
                    obsRequest(value, "replacement-secret"),
                    new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obs("stored-access", "stored-secret")));
            assertEquals(value, config.getConfig().getAccessKey());
        }
    }

    @Test
    void explicitClearCannotLeaveActiveObsWithoutCredentials() {
        ObjectStoreConfigRequest request = obsRequest(null, null);
        request.setClearSecrets(Set.of("secretKey"));

        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(
                request, new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obs("stored-access", "stored-secret"))));
    }

    @Test
    void rejectsProviderInapplicableAndUnknownFields() {
        ObjectStoreConfigRequest database = new ObjectStoreConfigRequest();
        database.setType(ObjectStoreDTO.Type.DATABASE.name());
        database.getConfig().setBucketName("unexpected");
        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(database, null));

        ObjectStoreConfigRequest unknown = new ObjectStoreConfigRequest();
        unknown.setType(ObjectStoreDTO.Type.FILE.name());
        unknown.markUnknownField("token", "discarded");
        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(unknown, null));
    }

    @Test
    void rejectsSecretClearForNonObsProvider() {
        ObjectStoreConfigRequest request = new ObjectStoreConfigRequest();
        request.setType(ObjectStoreDTO.Type.DATABASE.name());
        request.setClearSecrets(Set.of("accessKey"));

        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(request, null));
    }

    @Test
    void rejectsSupplyingAndClearingSameSecret() {
        ObjectStoreConfigRequest request = obsRequest("replacement", null);
        request.setClearSecrets(Set.of("accessKey"));

        assertThrows(IllegalArgumentException.class, () -> mapper.toConfig(
                request, new ObjectStoreDTO<>(ObjectStoreDTO.Type.OBS, obs("stored-access", "stored-secret"))));
    }

    @Test
    void rejectsUnsafeObsEndpointComponents() {
        assertThrows(IllegalArgumentException.class,
                () -> mapper.validateObsEndpoint("http://obs.cn-north-4.myhuaweicloud.com"));
        assertThrows(IllegalArgumentException.class,
                () -> mapper.validateObsEndpoint("https://user@obs.cn-north-4.myhuaweicloud.com"));
        assertThrows(IllegalArgumentException.class,
                () -> mapper.validateObsEndpoint("https://obs.cn-north-4.myhuaweicloud.com?token=value"));
        assertThrows(IllegalArgumentException.class,
                () -> mapper.validateObsEndpoint("https://obs.cn-north-4.myhuaweicloud.com#fragment"));
        assertThrows(IllegalArgumentException.class,
                () -> mapper.validateObsEndpoint("https://obs.cn-north-4.myhuaweicloud.com/path"));
    }

    private ObjectStoreConfigRequest obsRequest(String accessKey, String secretKey) {
        ObjectStoreConfigOptions options = new ObjectStoreConfigOptions();
        options.setAccessKey(accessKey);
        options.setSecretKey(secretKey);
        options.setBucketName("bucket");
        options.setEndpoint("https://obs.cn-north-4.myhuaweicloud.com");
        ObjectStoreConfigRequest request = new ObjectStoreConfigRequest();
        request.setType(ObjectStoreDTO.Type.OBS.name());
        request.setConfig(options);
        return request;
    }

    private ObjectStoreDTO.ObsConfig obs(String accessKey, String secretKey) {
        ObjectStoreDTO.ObsConfig options = new ObjectStoreDTO.ObsConfig();
        options.setAccessKey(accessKey);
        options.setSecretKey(secretKey);
        options.setBucketName("bucket");
        options.setEndpoint("https://obs.cn-north-4.myhuaweicloud.com");
        options.setSavePath("hertzbeat");
        return options;
    }
}
