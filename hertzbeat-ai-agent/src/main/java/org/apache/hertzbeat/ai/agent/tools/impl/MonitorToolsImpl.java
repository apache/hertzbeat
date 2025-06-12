package org.apache.hertzbeat.ai.agent.tools.impl;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.tools.MonitorTools;
import java.util.Map;

/**
 * Implementation of Monitoring Tools functionality
 */
@Service
public class MonitorToolsImpl implements MonitorTools {

    @Override
    @Tool(name = "get_active_monitors", description = "Get all the active monitors")
    public Map<String, String> getMonitors() {
        return Map.of(
                "Openai", "1",
                "GCP", "2",
                "AWS", "3");
    }

    @Override
    @Tool(name = "add_monitor", description = "Add a new monitor")
    public String addMonitor(String name) {
        return "Monitor added: " + name;
    }
}