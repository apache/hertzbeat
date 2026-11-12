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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogRepeatedErrors;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GreptimeRepeatedErrorSqlTest {
    private final String malicious = "x' OR 1=1; DROP TABLE hertzbeat_logs; --";

    @Test
    void bindsEveryUntrustedValueInsteadOfInterpolatingIt() {
        var scope = new LogRepeatedErrors.Scope(malicious, 1000, 901000, malicious, malicious);
        var query = GreptimeRepeatedErrorSql.groups(scope);
        assertFalse(query.sql().contains(malicious));
        assertEquals(List.of(malicious, 1000000000L, 901000000000L, malicious, malicious), query.parameters());
        assertEquals(5, query.sql().chars().filter(value -> value == '?').count());
    }

    @Test
    void limitsBudgetProbeBeforeReturningFullWindowEvidence() {
        var query = GreptimeRepeatedErrorSql.groups(new LogRepeatedErrors.Scope("a", 0, 900000, null, null));
        assertTrue(query.sql().contains("LIMIT 10001"));
        assertTrue(query.sql().contains("MAX(LENGTH(body))"));
        assertTrue(query.sql().contains("severity_number BETWEEN 17 AND 20"));
    }

    @Test
    void globallyRanksExactTupleRatherThanHierarchicalPrefixTopN() {
        var query = GreptimeRepeatedErrorSql.groups(new LogRepeatedErrors.Scope("a", 0, 900000, null, null));
        assertTrue(query.sql().contains("GROUP BY service_name, environment, body"));
        assertTrue(query.sql().contains(", body HAVING COUNT(*) >= 2"));
        assertTrue(query.sql().contains("event_count DESC, service_name ASC, environment ASC, body ASC LIMIT 3"));
        assertFalse(query.sql().contains("REGEXP"));
    }

    @Test
    void drilldownKeepsWorkspaceTimeSeverityAndExactTuple() {
        var scope = new LogRepeatedErrors.Scope("a", 1000, 901000, null, null);
        var query = GreptimeRepeatedErrorSql.exactRecords(scope, "service", "prod", malicious);
        assertFalse(query.sql().contains(malicious));
        assertEquals(malicious, query.parameters().getLast());
        assertTrue(query.sql().contains("body = ?"));
        assertTrue(query.sql().contains("hertzbeat_workspace_id = ?"));
        assertTrue(query.sql().contains("LIMIT 20"));
    }

    @Test
    void doesNotWrapOverflowingTimestampParameters() {
        var scope = new LogRepeatedErrors.Scope("a", Long.MAX_VALUE - 1, Long.MAX_VALUE, null, null);
        assertThrows(ArithmeticException.class, () -> GreptimeRepeatedErrorSql.groups(scope));
    }
}
