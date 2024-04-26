package org.apache.hertzbeat.collector.collect.redfish;

/**
 * redfish client interface
 */
public interface ConnectSession extends AutoCloseable {
    boolean isOpen();

    String getRedfishResource(String uri) throws Exception;
}
