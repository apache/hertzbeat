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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.ArrayList;
import java.util.List;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection;
import org.junit.jupiter.api.Test;

class GreptimeLogSelectionPreparationTest {
    @Test
    void rejectsAbsentTrustedWorkspaceBeforeNativeQuery() {
        var storage = org.mockito.Mockito.mock(GreptimeDbDataStorage.class, org.mockito.Mockito.CALLS_REAL_METHODS);
        var executor = org.mockito.Mockito.mock(org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor.class);
        org.springframework.test.util.ReflectionTestUtils.setField(storage, "greptimeSqlQueryExecutor", executor);
        var key = new LogGroupSelection.Key(LogFacets.Field.parse("attribute:a"), "value", "2");
        var selection = new LogGroupSelection(1, List.of(key));
        assertThrows(IllegalArgumentException.class, () -> storage.prepareLogGroupSelection(null, selection));
        assertThrows(IllegalArgumentException.class, () -> storage.prepareLogGroupSelection(" ", selection));
        org.mockito.Mockito.verifyNoInteractions(executor);
    }

    @Test
    void preparedTargetsAreImmutableAndExactlyOrdered() {
        var key = new LogGroupSelection.Key(LogFacets.Field.parse("attribute:proof.value"), "value", "2.0");
        var selection = new LogGroupSelection(1, List.of(key));
        var targets = new ArrayList<>(List.of(new PreparedLogGroupSelection.Target(key, null, Double.doubleToRawLongBits(2.0))));
        var prepared = new PreparedLogGroupSelection(selection, targets);
        targets.clear();
        assertEquals(1, prepared.targets().size());
        assertThrows(UnsupportedOperationException.class, () -> prepared.targets().clear());
        assertThrows(IllegalArgumentException.class, () -> new PreparedLogGroupSelection(selection, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new PreparedLogGroupSelection.Target(key, null, Double.doubleToRawLongBits(Double.NaN)));
        var missing = new LogGroupSelection.Key(key.field(), "missing", null);
        assertThrows(IllegalArgumentException.class, () -> new PreparedLogGroupSelection.Target(missing, 2L, null));
    }
}
