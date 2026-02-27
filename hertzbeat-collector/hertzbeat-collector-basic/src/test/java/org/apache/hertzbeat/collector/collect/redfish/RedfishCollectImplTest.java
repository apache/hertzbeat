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

package org.apache.hertzbeat.collector.collect.redfish;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link RedfishCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class RedfishCollectImplTest {
    @Mock
    private RedfishProtocol redfishProtocol;

    @Mock
    private ConnectSession redfishConnectSession;

    @Mock
    private RedfishClient redfishClient;

    @InjectMocks
    private RedfishCollectImpl redfishCollect;

    @BeforeEach
    void setUp() {
        redfishProtocol = RedfishProtocol.builder()
                .host("https://127.0.0.1")
                .port("5000")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .build();
    }

    @Test
    void collect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> jsonPath = new ArrayList<>();
        jsonPath.add("$.Id");
        Metrics metrics = new Metrics();
        metrics.setRedfish(redfishProtocol);
        metrics.getRedfish().setJsonPath(jsonPath);
        metrics.setName("Chassis");
        RedfishClient.create(redfishProtocol);
        redfishCollect.preCheck(metrics);
        redfishCollect.collect(builder, metrics);
    }

    @Test
    void mockCollect() throws Exception {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> jsonPath = new ArrayList<>();
        jsonPath.add("$.['@odata.id']");
        redfishProtocol.setSchema("/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/PowerSupplies");
        Metrics metrics = new Metrics();
        metrics.setRedfish(redfishProtocol);
        metrics.getRedfish().setJsonPath(jsonPath);
        metrics.setName("PowerSupply");
        String chassis = """
                {
                    "@odata.type": "#ChassisCollection.ChassisCollection",
                    "Name": "Chassis Collection",
                    "Members@odata.count": 2,
                    "Members": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/1U"
                        },
                        {
                            "@odata.id": "/redfish/v1/Chassis/2U"
                        }
                    ]
                }""";
        String powerSupplies1U = """
                {
                    "@odata.type": "#PowerSupplyCollection.PowerSupplyCollection",
                    "Name": "Power Supply Collection",
                    "Members@odata.count": 2,
                    "Members": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1"
                        },
                        {
                            "@odata.id": "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2"
                        }
                    ]
                }""";
        String powerSupplies2U = """
                {
                    "@odata.type": "#PowerSupplyCollection.PowerSupplyCollection",
                    "Name": "Power Supply Collection",
                    "Members@odata.count": 2,
                    "Members": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1"
                        },
                        {
                            "@odata.id": "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2"
                        }
                    ]
                }""";
        String bay1U1 = """
                {
                    "@odata.type": "#PowerSupply.v1_5_3.PowerSupply",
                    "Id": "Bay1",
                    "Name": "Power Supply Bay 1",
                    "@odata.id": "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1"
                }""";
        String bay2U1 = """
                {
                    "@odata.type": "#PowerSupply.v1_5_3.PowerSupply",
                    "Id": "Bay2",
                    "Name": "Power Supply Bay 2",
                    "@odata.id": "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2"
                }""";
        String bay1U2 = """
                {
                    "@odata.type": "#PowerSupply.v1_5_3.PowerSupply",
                    "Id": "Bay1",
                    "Name": "Power Supply Bay 1",
                    "@odata.id": "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1"
                }""";
        String bay2U2 = """
                {
                    "@odata.type": "#PowerSupply.v1_5_3.PowerSupply",
                    "Id": "Bay2",
                    "Name": "Power Supply Bay 2",
                    "@odata.id": "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2"
                }""";
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/")).thenReturn(chassis);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies")).thenReturn(powerSupplies1U);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies")).thenReturn(powerSupplies2U);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1")).thenReturn(bay1U1);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2")).thenReturn(bay2U1);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1")).thenReturn(bay1U2);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2")).thenReturn(bay2U2);
        MockedStatic<RedfishClient> clientMockedStatic = Mockito.mockStatic(RedfishClient.class);
        clientMockedStatic.when(() -> RedfishClient.create(redfishProtocol)).thenReturn(redfishClient);
        Mockito.when(redfishClient.connect()).thenReturn(redfishConnectSession);
        redfishCollect.preCheck(metrics);
        redfishCollect.collect(builder, metrics);
        assertEquals("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1", builder.getValues(0).getColumns(0));
        assertEquals("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2", builder.getValues(1).getColumns(0));
        assertEquals("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1", builder.getValues(2).getColumns(0));
        assertEquals("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2", builder.getValues(3).getColumns(0));
    }

    @Test
    void preCheck() throws Exception {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> redfishCollect.preCheck(null));

        // protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            redfishCollect.preCheck(metrics);
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_REDFISH, redfishCollect.supportProtocol());
    }
}
