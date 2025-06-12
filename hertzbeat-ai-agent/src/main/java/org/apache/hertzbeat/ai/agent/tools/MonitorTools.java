package org.apache.hertzbeat.ai.agent.tools;

import java.util.Map;

/**
 * Interface for Monitoring Tools
 */
public interface MonitorTools {

    /**
     * Retrieves all the active monitors.
     *
     * @return a map containing monitor names as keys and their respective IDs as values.
     */
    Map<String, String> getMonitors();

    /**
     * Adds a new monitor.
     *
     * @param name the name of the monitor to be added.
     * @return a confirmation message indicating the addition of the monitor.
     */
    String addMonitor(String name);
}