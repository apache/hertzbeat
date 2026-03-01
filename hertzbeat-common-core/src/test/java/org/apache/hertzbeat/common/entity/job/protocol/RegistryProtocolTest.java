package org.apache.hertzbeat.common.entity.job.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegistryProtocolTest {

    @Test
    void isInvalid() {

        RegistryProtocol protocol1 = new RegistryProtocol();
        protocol1.setPort("8080");
        protocol1.setHost("127.0.0.1");
        assertTrue(protocol1.isInvalid());

        RegistryProtocol protocol2 = new RegistryProtocol();
        protocol2.setPort("8080");
        protocol2.setHost("www.baidu.com");
        assertTrue(protocol2.isInvalid());

        RegistryProtocol protocol3 = new RegistryProtocol();
        protocol3.setPort("8080");
        protocol3.setHost("www.baidu.com.");
        assertFalse(protocol3.isInvalid());

        RegistryProtocol protocol4 = new RegistryProtocol();
        protocol3.setPort("80800");
        protocol3.setHost("10.45.56.344");
        assertFalse(protocol4.isInvalid());
    }
}
