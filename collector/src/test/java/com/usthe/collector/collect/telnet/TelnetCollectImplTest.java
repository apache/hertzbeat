package com.usthe.collector.collect.telnet;

import org.apache.commons.net.telnet.TelnetClient;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.ConnectException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * @author tom
 * @date 2021/12/4 19:39
 */
class TelnetCollectImplTest {

    @Test
    void telnet() {
        TelnetClient telnetClient = null;
        try {
            telnetClient = new TelnetClient("vt200");
            telnetClient.setConnectTimeout(5000);
            TelnetClient finalTelnetClient = telnetClient;
            assertThrows(ConnectException.class,() -> finalTelnetClient.connect("127.0.0.1",0));
            telnetClient.disconnect();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (telnetClient != null) {
                try {
                    telnetClient.disconnect();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}