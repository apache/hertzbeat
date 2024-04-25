package org.apache.hertzbeat.collector.collect.redfish;

import java.io.Closeable;

/**
 * redfish client interface
 */
public interface ConnectSession extends Closeable {
    void connect();

    boolean isOpen();
}
