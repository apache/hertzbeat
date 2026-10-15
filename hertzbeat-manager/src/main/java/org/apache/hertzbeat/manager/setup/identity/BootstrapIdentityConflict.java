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

package org.apache.hertzbeat.manager.setup.identity;

import java.sql.SQLException;
import org.springframework.dao.DataIntegrityViolationException;

/** Stable application failure for a concurrent or repeated bootstrap identity transition. */
public final class BootstrapIdentityConflict extends IllegalStateException {
    public BootstrapIdentityConflict() {
        super("Administrator identity is already initialized");
    }

    static RuntimeException map(DataIntegrityViolationException exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof SQLException sqlException && isUniqueViolation(sqlException)) {
                return new BootstrapIdentityConflict();
            }
            current = current.getCause();
        }
        return exception;
    }

    private static boolean isUniqueViolation(SQLException exception) {
        return "23505".equals(exception.getSQLState())
                || ("23000".equals(exception.getSQLState()) && exception.getErrorCode() == 1062);
    }
}
