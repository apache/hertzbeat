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

import java.util.List;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupWarningCode;

/** Validates metadata database type/address consistency before a connectivity probe. */
final class MetadataConfigurationValidator {
    Validation validate(MetadataDatabaseConfiguration configuration) {
        return validate(configuration.kind(), configuration.jdbcUrl());
    }

    Validation validate(MetadataDatabaseKind kind, String jdbcUrl) {
        String expectedPrefix = switch (kind) {
            case H2 -> "jdbc:h2:";
            case MYSQL -> "jdbc:mysql:";
            case POSTGRESQL -> "jdbc:postgresql:";
        };
        if (!jdbcUrl.startsWith(expectedPrefix)) {
            return Validation.failed(SetupErrorCode.METADATA_KIND_UNSUPPORTED);
        }
        return Validation.success();
    }

    record Validation(boolean valid, SetupErrorCode errorCode, List<SetupWarningCode> warnings) {
        static Validation success() {
            return new Validation(true, null, List.of());
        }

        static Validation failed(SetupErrorCode code) {
            return new Validation(false, code, List.of());
        }
    }
}
