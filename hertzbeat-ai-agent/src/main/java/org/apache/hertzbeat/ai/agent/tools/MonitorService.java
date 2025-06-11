package org.apache.hertzbeat.ai.agent.tools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

/**
 * Weather Service
 */
@Service
public class MonitorService {

    @Tool(name = "get_active_monitors", description = "Get all the active monitors")
    public Map<String, String> getMonitors() {
        return Map.of(
                "Openai", "1",
                "GCP", "2",
                "AWS", "3");
    }

    @Tool(name = "add_monitor", description = "Add a new monitor")
    public String addMonitor(String name) {
        return "Monitor added: " + name;
    }
}