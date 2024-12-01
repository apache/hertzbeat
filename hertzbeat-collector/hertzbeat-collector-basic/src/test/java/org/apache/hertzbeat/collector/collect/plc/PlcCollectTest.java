package org.apache.hertzbeat.collector.collect.plc;


import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PlcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link PlcCollectImpl}
 */
public class PlcCollectTest {
    private PlcCollectImpl plcCollect;
    private Metrics metrics;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    public void setup() {
        plcCollect = new PlcCollectImpl();
        PlcProtocol plc = PlcProtocol.builder().build();
        metrics = Metrics.builder()
                .plc(plc)
                .build();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // host is empty
        assertThrows(IllegalArgumentException.class, () -> {
            plcCollect.preCheck(metrics);
        });

        // port is empty default add 502
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // driverName version is empty
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // addressSyntax is empty
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // registerAddresses version is empty
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // aliasFields is empty
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            plc.setRegisterAddresses(List.of("1"));
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // the number of aliasFields is not equal to registerAddresses(responseTime doesn't count)
        assertThrows(IllegalArgumentException.class, () -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            plc.setRegisterAddresses(List.of("1", "2"));
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0"
            ));
            metrics.setPlc(plc);
            plcCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            plc.setRegisterAddresses(List.of("1", "2", "3[2]"));
            plc.setSlaveId("2");
            plc.setTimeout("500");
            metrics.setPlc(plc);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1",
                    "holding-register:2-0",
                    "holding-register:2-1"
            ));
            plcCollect.preCheck(metrics);
        });
    }

    @Test
    void supportProtocol() {
        Assertions.assertEquals(DispatchConstants.PROTOCOL_PLC, plcCollect.supportProtocol());
    }

    @Test
    void collect() {
        // with holding-register
        assertDoesNotThrow(() -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            plc.setRegisterAddresses(List.of("1", "2[2]"));
            plc.setSlaveId("1");
            plc.setTimeout("500");

            metrics.setPlc(plc);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1-0",
                    "holding-register:1-1",
                    "holding-register:1-2"
            ));
            plcCollect.collect(builder, 1L, "app", metrics);
        });

        // with coil
        assertDoesNotThrow(() -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("coil");
            plc.setRegisterAddresses(List.of("1", "2[2]"));
            plc.setSlaveId("1");
            plc.setTimeout("500");

            metrics.setPlc(plc);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "coil:0",
                    "coil:1-0",
                    "coil:1-1",
                    "coil:1-2"
            ));

            plcCollect.collect(builder, 1L, "app", metrics);
        });


        // with slaveId2
        // with holding-register
        assertDoesNotThrow(() -> {
            PlcProtocol plc = PlcProtocol.builder().build();
            plc.setHost("127.0.0.1");
            plc.setPort("502");
            plc.setDriverName("modbus-tcp");
            plc.setAddressSyntax("holding-register");
            plc.setRegisterAddresses(List.of("1", "2[2]"));
            plc.setSlaveId("2");
            plc.setTimeout("500");

            metrics.setPlc(plc);
            metrics.setAliasFields(List.of(
                    "responseTime",
                    "holding-register:0",
                    "holding-register:1-0",
                    "holding-register:1-1",
                    "holding-register:1-2"
            ));
            plcCollect.collect(builder, 1L, "app", metrics);
        });

    }

}
