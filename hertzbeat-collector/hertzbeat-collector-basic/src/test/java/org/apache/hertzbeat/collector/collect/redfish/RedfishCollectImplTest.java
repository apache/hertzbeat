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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.RedfishProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterEach;
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
    private RedfishProtocol redfishProtocol;

    @Mock
    private ConnectSession redfishConnectSession;

    @Mock
    private RedfishClient redfishClient;

    @InjectMocks
    private RedfishCollectImpl redfishCollect;

    private MockedStatic<RedfishClient> clientMockedStatic;

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

    @AfterEach
    void closeStaticMock() {
        if (clientMockedStatic != null) {
            clientMockedStatic.close();
            clientMockedStatic = null;
        }
    }

    private void givenConnectedSession() throws Exception {
        clientMockedStatic = Mockito.mockStatic(RedfishClient.class);
        clientMockedStatic.when(() -> RedfishClient.create(redfishProtocol)).thenReturn(redfishClient);
        Mockito.when(redfishClient.connect()).thenReturn(redfishConnectSession);
    }

    private Metrics metrics(String name, String... jsonPaths) {
        redfishProtocol.setJsonPath(List.of(jsonPaths));
        Metrics metrics = new Metrics();
        metrics.setName(name);
        metrics.setRedfish(redfishProtocol);
        return metrics;
    }

    private CollectRep.MetricsData.Builder collectMetrics(Metrics metrics) throws Exception {
        givenConnectedSession();
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        redfishCollect.preCheck(metrics);
        redfishCollect.collect(builder, metrics);
        return builder;
    }

    private void givenResource(String uri, String response) throws Exception {
        Mockito.when(redfishConnectSession.getRedfishResource(uri)).thenReturn(response);
    }

    private void givenUnavailable(String uri) throws Exception {
        Mockito.when(redfishConnectSession.getRedfishResource(uri))
                .thenThrow(new Exception("Redfish session get resource error:StatusCode 404"));
    }

    private static String collection(String... resourceUris) {
        String members = Arrays.stream(resourceUris)
                .map(uri -> "{\"@odata.id\":\"" + uri + "\"}")
                .collect(Collectors.joining(","));
        return "{\"Members\":[" + members + "]}";
    }

    private static String resource(String uri, String name) {
        return "{\"@odata.id\":\"" + uri + "\",\"Name\":\"" + name + "\"}";
    }

    @Test
    void collectChassis() throws Exception {
        Metrics metrics = metrics("Chassis", "$.Name");
        String chassisUri = "/redfish/v1/Chassis/1";
        givenResource("/redfish/v1/Chassis", collection(chassisUri));
        givenResource(chassisUri, resource(chassisUri, "Main Chassis"));

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals("Main Chassis", builder.getValues(0).getColumns(0));
    }

    @Test
    void collectsConfiguredSchema() throws Exception {
        redfishProtocol.setSchema("/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/PowerSupplies");
        Metrics metrics = metrics("PowerSupply", "$.['@odata.id']");
        String bay1U1 = "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1";
        String bay2U1 = "/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2";
        String bay1U2 = "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1";
        String bay2U2 = "/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2";
        givenResource("/redfish/v1/Chassis/", collection("/redfish/v1/Chassis/1U", "/redfish/v1/Chassis/2U"));
        givenResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies", collection(bay1U1, bay2U1));
        givenResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies", collection(bay1U2, bay2U2));
        givenResource(bay1U1, resource(bay1U1, "Power Supply Bay 1"));
        givenResource(bay2U1, resource(bay2U1, "Power Supply Bay 2"));
        givenResource(bay1U2, resource(bay1U2, "Power Supply Bay 1"));
        givenResource(bay2U2, resource(bay2U2, "Power Supply Bay 2"));

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);
        assertEquals(bay1U1, builder.getValues(0).getColumns(0));
        assertEquals(bay2U1, builder.getValues(1).getColumns(0));
        assertEquals(bay1U2, builder.getValues(2).getColumns(0));
        assertEquals(bay2U2, builder.getValues(3).getColumns(0));
    }

    @Test
    void collectFansFromLegacyThermalDocument() throws Exception {
        Metrics metrics = metrics("Fan", "$.Name", "$.Reading", "$.Status.Health");
        String thermal = """
                {
                    "@odata.context": "/redfish/v1/$metadata#Thermal.Thermal",
                    "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Thermal",
                    "@odata.type": "#Thermal.v1_7_1.Thermal",
                    "Fans": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Thermal#/Fans/0",
                            "@odata.type": "#Thermal.v1_7_1.Fan",
                            "FanName": "System Board Fan1A",
                            "MemberId": "0",
                            "Name": "System Board Fan1A",
                            "Reading": 3480,
                            "ReadingUnits": "RPM",
                            "Status": {
                                "Health": "OK",
                                "State": "Enabled"
                            }
                        },
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Thermal#/Fans/1",
                            "@odata.type": "#Thermal.v1_7_1.Fan",
                            "FanName": "System Board Fan1B",
                            "MemberId": "1",
                            "Name": "System Board Fan1B",
                            "Reading": 3240,
                            "ReadingUnits": "RPM",
                            "Status": {
                                "Health": "OK",
                                "State": "Enabled"
                            }
                        }
                    ]
                }""";
        givenResource("/redfish/v1/Chassis/", collection("/redfish/v1/Chassis/System.Embedded.1"));
        givenUnavailable("/redfish/v1/Chassis/System.Embedded.1/ThermalSubsystem/Fans");
        givenResource("/redfish/v1/Chassis/System.Embedded.1/Thermal", thermal);

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(2, builder.getValuesCount());
        assertEquals("System Board Fan1A", builder.getValues(0).getColumns(0));
        assertEquals("3480", builder.getValues(0).getColumns(1));
        assertEquals("OK", builder.getValues(0).getColumns(2));
        assertEquals("System Board Fan1B", builder.getValues(1).getColumns(0));
        assertEquals("3240", builder.getValues(1).getColumns(1));
        Mockito.verify(redfishConnectSession, Mockito.times(1))
                .getRedfishResource("/redfish/v1/Chassis/System.Embedded.1/Thermal");
    }

    @Test
    void collectPowerSuppliesFromLegacyPowerDocument() throws Exception {
        Metrics metrics = metrics("PowerSupply", "$.['@odata.id']", "$.Name");
        String power = """
                {
                    "PowerSupplies": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Power#/PowerSupplies/0",
                            "Name": "Power Supply 1"
                        }
                    ]
                }""";
        givenResource("/redfish/v1/Chassis/", collection("/redfish/v1/Chassis/System.Embedded.1"));
        givenUnavailable("/redfish/v1/Chassis/System.Embedded.1/PowerSubsystem/PowerSupplies");
        givenResource("/redfish/v1/Chassis/System.Embedded.1/Power", power);

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(1, builder.getValuesCount());
        assertEquals("/redfish/v1/Chassis/System.Embedded.1/Power#/PowerSupplies/0",
                builder.getValues(0).getColumns(0));
        assertEquals("Power Supply 1", builder.getValues(0).getColumns(1));
    }

    @Test
    void collectFailsWhenNoSchemaCandidateResolves() throws Exception {
        Metrics metrics = metrics("Fan", "$.Name");
        Mockito.when(redfishConnectSession.getRedfishResource(anyString()))
                .thenThrow(new Exception("Redfish session get resource error:StatusCode 404"));

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(CollectRep.Code.FAIL, builder.getCode());
    }

    @Test
    void legacyFanFieldsUseAvailableFallbacks() throws Exception {
        Metrics metrics = metrics("Fan", "$.['@odata.id']", "$.Name", "$.Status.State",
                "$.Status.Health", "$.SpeedPercent.Reading", "$.SpeedPercent.SpeedRPM");
        String thermal = """
                {
                    "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Thermal",
                    "Fans": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/System.Embedded.1/Thermal#/Fans/0",
                            "Name": "System Board Fan1A",
                            "Reading": 3480,
                            "ReadingUnits": "RPM",
                            "Status": {
                                "Health": "OK",
                                "State": "Enabled"
                            }
                        }
                    ]
                }""";
        givenResource("/redfish/v1/Chassis/", collection("/redfish/v1/Chassis/System.Embedded.1"));
        givenUnavailable("/redfish/v1/Chassis/System.Embedded.1/ThermalSubsystem/Fans");
        givenResource("/redfish/v1/Chassis/System.Embedded.1/Thermal", thermal);

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(1, builder.getValuesCount());
        assertEquals("System Board Fan1A", builder.getValues(0).getColumns(1));
        assertEquals("Enabled", builder.getValues(0).getColumns(2));
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(4));
        assertEquals("3480", builder.getValues(0).getColumns(5));
    }

    @Test
    void collectFallsBackPerChassis() throws Exception {
        Metrics metrics = metrics("Fan", "$.['@odata.id']", "$.Name");
        String modernFanUri = "/redfish/v1/Chassis/Modern/ThermalSubsystem/Fans/1";
        String legacyThermal = """
                {
                    "Fans": [
                        {
                            "@odata.id": "/redfish/v1/Chassis/Legacy/Thermal#/Fans/0",
                            "Name": "Legacy Fan"
                        }
                    ]
                }""";
        givenResource("/redfish/v1/Chassis/",
                collection("/redfish/v1/Chassis/Modern", "/redfish/v1/Chassis/Legacy"));
        givenResource("/redfish/v1/Chassis/Modern/ThermalSubsystem/Fans", collection(modernFanUri));
        givenUnavailable("/redfish/v1/Chassis/Legacy/ThermalSubsystem/Fans");
        givenUnavailable("/redfish/v1/Chassis/Modern/Thermal");
        givenResource("/redfish/v1/Chassis/Legacy/Thermal", legacyThermal);
        givenResource(modernFanUri, resource(modernFanUri, "Modern Fan"));

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(2, builder.getValuesCount());
        assertEquals("Modern Fan", builder.getValues(0).getColumns(1));
        assertEquals("Legacy Fan", builder.getValues(1).getColumns(1));
    }

    @Test
    void authFailureIsReportedInsteadOfMissingSchema() throws Exception {
        Metrics metrics = metrics("Fan", "$.Name");
        Mockito.when(redfishConnectSession.getRedfishResource(anyString()))
                .thenThrow(new Exception("Redfish session get resource error:StatusCode 401"));

        CollectRep.MetricsData.Builder builder = collectMetrics(metrics);

        assertEquals(CollectRep.Code.FAIL, builder.getCode());
        assertTrue(builder.getMsg().contains("401"));
    }

    @Test
    void preCheck() {
        assertThrows(IllegalArgumentException.class, () -> redfishCollect.preCheck(null));

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
