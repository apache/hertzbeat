package org.apache.hertzbeat.ai.agent.adapters.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

/**
 * Implementation of the MonitorServiceAdapter interface that provides access to monitor information
 * through reflection by invoking the underlying monitor service implementation.
 */
@Slf4j
@Component
public class MonitorServiceAdapterImpl implements MonitorServiceAdapter {

    @Override
    public Page<Monitor> getMonitors(
            List<Long> ids,
            String app,
            String search,
            Byte status,
            String sort,
            String order,
            int pageIndex,
            int pageSize,
            String labels) {
        try {
            Object monitorService = null;

            try {
                monitorService = SpringContextHolder.getBean("monitorServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'monitorServiceImpl', trying by class name");
            }

            assert monitorService != null;
            System.out.println("MonitorServiceImpl found: " + Arrays.toString(monitorService.getClass().getMethods()));
            // Get the method with correct parameter types
            Method method = monitorService.getClass().getMethod(
                    "getMonitors",
                    List.class, String.class, String.class, Byte.class,
                    String.class, String.class, int.class, int.class, String.class);


            // Invoke the method and cast the result
            @SuppressWarnings("unchecked")
            Page<Monitor> result = (Page<Monitor>) method.invoke(
                    monitorService,
                    ids, app, search, status, sort, order, pageIndex, pageSize, labels);

            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getMonitors", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to invoke getMonitors via adapter", e);
        }
    }

}