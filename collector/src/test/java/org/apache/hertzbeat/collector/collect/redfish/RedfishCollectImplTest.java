package org.apache.hertzbeat.collector.collect.redfish;

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

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
        List<String> aliasField = new ArrayList<>();
        aliasField.add("$.Id");
        Metrics metrics = new Metrics();
        metrics.setRedfish(redfishProtocol);
        metrics.setAliasFields(aliasField);
        metrics.setName("Chassis");
        RedfishClient.create(redfishProtocol);
        redfishCollect.collect(builder, 1L, "test", metrics);
    }

    @Test
    void mockCollect() throws Exception {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        List<String> aliasField = new ArrayList<>();
        aliasField.add("$.['@odata.id']");
        redfishProtocol.setSchema("/redfish/v1/Chassis/{ChassisId}/PowerSubsystem/PowerSupplies");
        Metrics metrics = new Metrics();
        metrics.setRedfish(redfishProtocol);
        metrics.setAliasFields(aliasField);
        metrics.setName("PowerSupply");
        String Chassis = "{\n" +
                "    \"@odata.type\": \"#ChassisCollection.ChassisCollection\",\n" +
                "    \"Name\": \"Chassis Collection\",\n" +
                "    \"Members@odata.count\": 2,\n" +
                "    \"Members\": [\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/1U\"\n" +
                "        },\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/2U\"\n" +
                "        }\n" +
                "    ]\n" +
                "}";
        String powerSupplies1U = "{\n" +
                "    \"@odata.type\": \"#PowerSupplyCollection.PowerSupplyCollection\",\n" +
                "    \"Name\": \"Power Supply Collection\",\n" +
                "    \"Members@odata.count\": 2,\n" +
                "    \"Members\": [\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1\"\n" +
                "        },\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2\"\n" +
                "        }\n" +
                "    ]\n" +
                "}";
        String powerSupplies2U = "{\n" +
                "    \"@odata.type\": \"#PowerSupplyCollection.PowerSupplyCollection\",\n" +
                "    \"Name\": \"Power Supply Collection\",\n" +
                "    \"Members@odata.count\": 2,\n" +
                "    \"Members\": [\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1\"\n" +
                "        },\n" +
                "        {\n" +
                "            \"@odata.id\": \"/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2\"\n" +
                "        }\n" +
                "    ]\n" +
                "}";
        String bay1U1 = "{\n" +
                "    \"@odata.type\": \"#PowerSupply.v1_5_3.PowerSupply\",\n" +
                "    \"Id\": \"Bay1\",\n" +
                "    \"Name\": \"Power Supply Bay 1\",\n" +
                "    \"@odata.id\": \"/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1\"\n" +
                "}";
        String bay2U1 = "{\n" +
                "    \"@odata.type\": \"#PowerSupply.v1_5_3.PowerSupply\",\n" +
                "    \"Id\": \"Bay2\",\n" +
                "    \"Name\": \"Power Supply Bay 2\",\n" +
                "    \"@odata.id\": \"/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2\"\n" +
                "}";
        String bay1U2 = "{\n" +
                "    \"@odata.type\": \"#PowerSupply.v1_5_3.PowerSupply\",\n" +
                "    \"Id\": \"Bay1\",\n" +
                "    \"Name\": \"Power Supply Bay 1\",\n" +
                "    \"@odata.id\": \"/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1\"\n" +
                "}";
        String bay2U2 = "{\n" +
                "    \"@odata.type\": \"#PowerSupply.v1_5_3.PowerSupply\",\n" +
                "    \"Id\": \"Bay2\",\n" +
                "    \"Name\": \"Power Supply Bay 2\",\n" +
                "    \"@odata.id\": \"/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2\"\n" +
                "}";
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/")).thenReturn(Chassis);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies")).thenReturn(powerSupplies1U);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies")).thenReturn(powerSupplies2U);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1")).thenReturn(bay1U1);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2")).thenReturn(bay2U1);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1")).thenReturn(bay1U2);
        Mockito.when(redfishConnectSession.getRedfishResource("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2")).thenReturn(bay2U2);
        MockedStatic<RedfishClient> clientMockedStatic = Mockito.mockStatic(RedfishClient.class);
        clientMockedStatic.when(() -> RedfishClient.create(redfishProtocol)).thenReturn(redfishClient);
        Mockito.when(redfishClient.connect()).thenReturn(redfishConnectSession);
        redfishCollect.collect(builder, 1L, "test", metrics);
        assertEquals("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay1", builder.getValues(0).getColumns(0));
        assertEquals("/redfish/v1/Chassis/1U/PowerSubsystem/PowerSupplies/Bay2", builder.getValues(1).getColumns(0));
        assertEquals("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay1", builder.getValues(2).getColumns(0));
        assertEquals("/redfish/v1/Chassis/2U/PowerSubsystem/PowerSupplies/Bay2", builder.getValues(3).getColumns(0));
    }
}
