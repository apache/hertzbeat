package org.apache.hertzbeat.ai.agent.tools;

import java.util.List;

/**
 * Interface for Monitoring Tools
 */
public interface MonitorTools {

    String addMonitor(String name);

    /**
     * Query monitor information with flexible filtering and pagination.
     * Supports filtering by monitor IDs, type, status, host, labels, sorting, and
     * pagination.
     * Returns results as plain JSON.
     */
    String listMonitors(
            List<Long> ids,
            String app,
            Byte status,
            String search,
            String labels,
            String sort,
            String order,
            int pageIndex,
            int pageSize);
}