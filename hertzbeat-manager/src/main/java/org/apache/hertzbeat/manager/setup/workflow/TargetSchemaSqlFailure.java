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

import java.sql.SQLException;
import java.sql.SQLNonTransientConnectionException;
import java.sql.SQLRecoverableException;
import java.sql.SQLTimeoutException;
import java.sql.SQLTransientConnectionException;

/** Classifies JDBC failures without retaining driver messages or connection details. */
final class TargetSchemaSqlFailure {

    private TargetSchemaSqlFailure() {
    }

    static boolean isTimeout(SQLException failure) {
        String state = failure.getSQLState();
        return failure instanceof SQLTimeoutException
                || "HYT00".equals(state)
                || "HYT01".equals(state)
                || "57014".equals(state);
    }

    static boolean invalidatesConnection(SQLException failure) {
        String state = failure.getSQLState();
        return isTimeout(failure)
                || failure instanceof SQLTransientConnectionException
                || failure instanceof SQLNonTransientConnectionException
                || failure instanceof SQLRecoverableException
                || state != null && state.startsWith("08");
    }
}
