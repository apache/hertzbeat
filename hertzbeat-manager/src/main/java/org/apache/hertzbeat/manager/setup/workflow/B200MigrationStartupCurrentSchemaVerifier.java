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

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Compares the target to the packaged B200 history and semantic schema contract without writes. */
final class B200MigrationStartupCurrentSchemaVerifier implements MigrationStartupCurrentSchemaVerifier {

    @Override
    public boolean isCurrent(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) throws SQLException {
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(deadline);
        budget.check();
        TargetSchemaBaseline baseline;
        try {
            baseline = TargetSchemaBaseline.load(kind);
        } catch (MetadataMigrationException timeout) {
            throw timeout;
        } catch (IOException | RuntimeException failure) {
            throw new MigrationStartupReconciliationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        budget.check();
        return new FlywaySchemaHistory(kind).isCurrent(connection, baseline, budget);
    }
}
