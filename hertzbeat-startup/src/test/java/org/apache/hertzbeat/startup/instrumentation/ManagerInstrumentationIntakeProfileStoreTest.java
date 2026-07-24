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

package org.apache.hertzbeat.startup.instrumentation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementReader;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.Availability;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeKind;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.OtlpTransport;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class ManagerInstrumentationIntakeProfileStoreTest {

    @Test
    void mapsOnlyExistingExplicitAdvertisementsWithoutInferringEndpoints() {
        Collector server = collector("server-advertisement");
        Collector edge = collector("edge");
        CollectorDao dao = mock(CollectorDao.class);
        CollectorIntakeAdvertisementReader reader = mock(CollectorIntakeAdvertisementReader.class);
        when(dao.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(server, edge)));
        when(reader.read(server)).thenReturn(availableServer());
        when(reader.read(edge)).thenReturn(CollectorInstrumentationIntake.unavailable(
                "edge", CollectorInstrumentationIntake.ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE));

        var profiles = new ManagerInstrumentationIntakeProfileStore(dao, reader).profiles();

        assertEquals(2, profiles.size());
        assertEquals("server:server-advertisement", profiles.getFirst().id());
        assertEquals(IntakeKind.SERVER, profiles.getFirst().kind());
        assertEquals("https://otel.example.test/v1", profiles.getFirst()
                .httpsEndpoints().get(OtlpTransport.HTTP_PROTOBUF));
        assertNull(profiles.getFirst().collectorId());
        assertEquals(IntakeKind.HERTZBEAT_COLLECTOR, profiles.get(1).kind());
        assertEquals(Availability.UNAVAILABLE, profiles.get(1).availability());
        assertEquals("edge", profiles.get(1).collectorId());
        assertEquals(true, profiles.get(1).httpsEndpoints().isEmpty());
    }

    private Collector collector(String name) {
        Collector collector = new Collector();
        collector.setName(name);
        return collector;
    }

    private CollectorInstrumentationIntake availableServer() {
        return new CollectorInstrumentationIntake(
                1,
                "server-advertisement",
                CollectorInstrumentationIntake.State.AVAILABLE,
                CollectorInstrumentationIntake.Gateway.SERVER,
                List.of(CollectorInstrumentationIntake.Capability.OTLP_HTTP_PROTOBUF),
                "https://otel.example.test/v1",
                null,
                "Authorization",
                null);
    }
}
