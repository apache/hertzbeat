package org.apache.hertzbeat.ai.agent.tools;

import java.util.Map;

/**
 * Interface for Monitoring Tools
 */
public interface MonitorTools {
    //    get the list of all active monitors
    Map<String, String> getMonitors();
    

    /**
     * Adds a new monitor with the given name.
     *
     * @param name the name of the monitor to add
     * @return a confirmation message for the added monitor
     */
    String addMonitor(String name);
}