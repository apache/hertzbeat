/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.calculate.realtime.window;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LogWorker Responsible for:
 * 1. Receiving logs from WindowedLogRealTimeAlertCalculator
 * 2. Evaluating alert expressions against logs
 * 3. Sending matching logs to WindowAggregator
 */
@Slf4j
@Component
public class LogWorker {
    
    private static final String LOG_PREFIX = "log";
    
    private final AlertDefineService alertDefineService;
    private final JexlExprCalculator jexlExprCalculator;
    private final WindowAggregator windowAggregator;
    private final AlerterWorkerPool workerPool;

    @Autowired
    public LogWorker(AlertDefineService alertDefineService,
                     JexlExprCalculator jexlExprCalculator, WindowAggregator windowAggregator,
                     AlerterWorkerPool workerPool) {
        this.alertDefineService = alertDefineService;
        this.jexlExprCalculator = jexlExprCalculator;
        this.windowAggregator = windowAggregator;
        this.workerPool = workerPool;
    }

    public void reduceAndSendLogTask(LogEntry logEntry) {
        workerPool.executeLogJob(reduceLogTask(logEntry));
    }

    public Runnable reduceLogTask(LogEntry logEntry) {
        return () -> {
            try {
                processLogEntry(logEntry);
            } catch (Exception e) {
                log.error("Error processing log entry in worker: {}", e.getMessage(), e);
            }
        };
    }

    private void processLogEntry(LogEntry logEntry) {
        // Get all log alert definitions
        List<AlertDefine> alertDefines = alertDefineService.getLogRealTimeAlertDefines();
        
        // Create context for expression evaluation
        Map<String, Object> context = new HashMap<>(8);
        context.put(LOG_PREFIX, logEntry);
        
        // Process each alert definition
        for (AlertDefine define : alertDefines) {
            if (define.getExpr() == null || define.getExpr().trim().isEmpty()) {
                continue;
            }
            
            try {
                // Evaluate alert expression
                boolean match = jexlExprCalculator.execAlertExpression(context, define.getExpr(), false);
                
                if (match) {
                    // Create matching log event and send to WindowAggregator
                    MatchingLogEvent event = createMatchingLogEvent(logEntry, define);
                    windowAggregator.addMatchingLog(event);
                }
            } catch (Exception e) {
                log.warn("Error evaluating expression for alert define {}: {}", define.getName(), e.getMessage());
            }
        }
    }
    
    private MatchingLogEvent createMatchingLogEvent(LogEntry logEntry, AlertDefine define) {
        long eventTimestamp = extractEventTimestamp(logEntry);
        
        return MatchingLogEvent.builder()
                .logEntry(logEntry)
                .alertDefine(define)
                .eventTimestamp(eventTimestamp)
                .workerTimestamp(System.currentTimeMillis())
                .build();
    }
    
    private long extractEventTimestamp(LogEntry logEntry) {
        if (logEntry.getTimeUnixNano() != null && logEntry.getTimeUnixNano() != 0) {
            return logEntry.getTimeUnixNano() / 1_000_000; // Convert to milliseconds
        }
        if (logEntry.getObservedTimeUnixNano() != null && logEntry.getObservedTimeUnixNano() != 0) {
            return logEntry.getObservedTimeUnixNano() / 1_000_000; // Convert to milliseconds
        }
        return System.currentTimeMillis();
    }
}