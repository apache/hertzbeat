package org.apache.hertzbeat.ai.agent.adapters;

import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import java.util.List;

/**
 * Interface that provides access to monitor information by retrieving monitor data
 * through the underlying monitor service.
 */
public interface MonitorServiceAdapter {
    Page<Monitor> getMonitors(
        List<Long> ids,
        String app,
        String search,
        Byte status,
        String sort,
        String order,
        int pageIndex,
        int pageSize,
        String labels
    );
} 