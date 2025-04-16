package org.apache.hertzbeat.mcp.server.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class LogServiceTest {

    @Test
    void getLog() {
        LogService logService = new LogService();
        String log = logService.getLog("select * from hzb_log where severity_number > 5 limit 2");
        System.out.println(log);
        assertNotNull(log);
    }
}