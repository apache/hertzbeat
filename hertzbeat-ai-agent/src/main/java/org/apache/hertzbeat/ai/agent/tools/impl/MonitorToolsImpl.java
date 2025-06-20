package org.apache.hertzbeat.ai.agent.tools.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.apache.hertzbeat.ai.agent.tools.MonitorTools;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import java.util.List;

/**
 * Implementation of Monitoring Tools functionality
 */
@Slf4j
@Service
public class MonitorToolsImpl implements MonitorTools {

    @Autowired
    private MonitorServiceAdapter monitorServiceAdapter;


    /**
     * Tool to query monitor information with flexible filtering and pagination.
     * Supports filtering by monitor IDs, type, status, host, labels, sorting, and
     * pagination.
     * Returns results as plain JSON.
     */
    @Override
    @Tool(name = "get_monitors", description = """

            Query monitor information with flexible filtering and pagination.
            Supports filtering by monitor IDs, type, status, host, labels, sorting, and pagination.
            Returns results as plain JSON.

            Parameters:
            - ids: List of monitor IDs to filter (optional)
            - app: Monitor type, e.g., 'linux' (optional)
            - status: Monitor status (0: no monitor, 1: usable, 2: disabled, 9: all) (optional)
            - search: Fuzzy search for host or name (optional)
            - labels: Monitor labels, e.g., 'env:prod,instance:22' (optional)
            - sort: Sort field, e.g., 'name' (default: gmtCreate)
            - order: Sort order, 'asc' or 'desc' (default: desc)
            - pageIndex: Page index (default: 0)
            - pageSize: Page size (default: 8)
            """)

    public String getMonitors(

            @ToolParam(description = "List of monitor IDs to filter (optional)") List<Long> ids,
            @ToolParam(description = "Monitor type, e.g., 'linux' (optional)") String app,
            @ToolParam(description = "Monitor status (0: no monitor, 1: usable, 2: disabled, 9: all) (optional)") Byte status,
            @ToolParam(description = "Fuzzy search for host or name (optional)") String search,
            @ToolParam(description = "Monitor labels, e.g., 'env:prod,instance:22' (optional)") String labels,
            @ToolParam(description = "Sort field, e.g., 'name' (default: gmtCreate)") String sort,
            @ToolParam(description = "Sort order, 'asc' or 'desc' (default: desc)") String order,
            @ToolParam(description = "Page index (default: 0)") int pageIndex,
            @ToolParam(description = "Page size (default: 8)") int pageSize) {
        try {
            Page<Monitor> result = monitorServiceAdapter.getMonitors(ids, app, search, status, sort, order, pageIndex,
                    pageSize, labels);
            log.info("MonitorServiceAdapter.getMonitors result: {}", result);
            return result.toString();
        } catch (Exception e) {
            return "Failed to query monitors: " + e.getMessage();
        }
    }

    @Override
    @Tool(name = "add_monitor", description = "Add a new monitor")
    public String addMonitor(String name) {
        return "Monitor added: " + name;
    }
}