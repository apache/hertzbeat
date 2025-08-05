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

package org.apache.hertzbeat.alert.calculate.realtime;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.util.AlertTemplateUtil;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import java.util.HashMap;
import java.util.Map;

/**
 * Abstract base class for real-time alert calculators
 * @param <T> The type of data being processed for alerts
 */
@Slf4j
public abstract class AbstractRealTimeAlertCalculator<T> {
    
    protected static final int CALCULATE_THREADS = 3;
    
    protected final AlerterWorkerPool workerPool;
    protected final CommonDataQueue dataQueue;
    protected final AlertDefineService alertDefineService;
    protected final AlarmCommonReduce alarmCommonReduce;
    protected final AlarmCacheManager alarmCacheManager;
    protected final JexlExprCalculator jexlExprCalculator;

    /**
     * Constructor with auto-start enabled
     */
    protected AbstractRealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                              AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                              AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager,
                                              JexlExprCalculator jexlExprCalculator) {
        this(workerPool, dataQueue, alertDefineService, singleAlertDao, alarmCommonReduce, alarmCacheManager, jexlExprCalculator, true);
    }

    /**
     * Constructor with configurable auto-start
     * 
     * @param workerPool          The worker pool used for concurrent alert calculation.
     * @param dataQueue           The queue from which data is pulled and pushed.
     * @param alertDefineService  The service providing alert definition rules.
     * @param singleAlertDao      The DAO for fetching persisted alert states from storage.
     * @param alarmCommonReduce   The component responsible for reducing and sending alerts.
     * @param alarmCacheManager   The cache manager for managing alert states.
     * @param start               If true, the alert calculation threads will start automatically;
     *                            set to false to disable thread start (useful for unit testing).
     */
    protected AbstractRealTimeAlertCalculator(AlerterWorkerPool workerPool, CommonDataQueue dataQueue,
                                              AlertDefineService alertDefineService, SingleAlertDao singleAlertDao,
                                              AlarmCommonReduce alarmCommonReduce, AlarmCacheManager alarmCacheManager,
                                              JexlExprCalculator jexlExprCalculator, boolean start) {
        this.workerPool = workerPool;
        this.dataQueue = dataQueue;
        this.alarmCommonReduce = alarmCommonReduce;
        this.alertDefineService = alertDefineService;
        this.alarmCacheManager = alarmCacheManager;
        this.jexlExprCalculator = jexlExprCalculator;
        if (start) {
            startCalculate();
        }
    }

    /**
     * Start the alert calculation threads
     */
    public void startCalculate() {
        Runnable runnable = () -> {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    T data = pollData();
                    if (data != null) {
                        calculate(data);
                        processDataAfterCalculation(data);
                    }
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    log.error("calculate alarm error: {}.", e.getMessage(), e);
                }
            }
        };
        for (int i = 0; i < CALCULATE_THREADS; i++) {
            workerPool.executeJob(runnable);
        }
    }

    /**
     * Poll data from the queue
     * @return The data to process
     * @throws InterruptedException if interrupted while waiting
     */
    protected abstract T pollData() throws InterruptedException;

    /**
     * Process the data after alert calculation
     * @param data The data that was processed
     */
    protected abstract void processDataAfterCalculation(T data);

    /**
     * Calculate alerts based on the data
     * @param data The data to calculate alerts for
     */
    protected abstract void calculate(T data);
} 