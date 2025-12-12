/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.analysis.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.analysis.algorithm.NLinearModel;
import org.apache.hertzbeat.analysis.algorithm.PredictionResult;
import org.apache.hertzbeat.analysis.algorithm.TimeSeriesPreprocessor;
import org.apache.hertzbeat.analysis.service.AnalysisService;
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Implementation of Analysis Service
 */
@Slf4j
@Service
public class AnalysisServiceImpl implements AnalysisService {

    @Autowired
    private TimeSeriesPreprocessor preprocessor;

    @Override
    public List<PredictionResult> forecast(List<History> historyData, long stepMillis, int forecastCount) {
        if (historyData == null || historyData.isEmpty()) {
            return Collections.emptyList();
        }

        // 1. Determine time range
        long minTime = Long.MAX_VALUE;
        long maxTime = Long.MIN_VALUE;
        for (History h : historyData) {
            if (h.getTime() < minTime) {
                minTime = h.getTime();
            }
            if (h.getTime() > maxTime) {
                maxTime = h.getTime();
            }
        }

        // Align start/end to step
        long startTime = (minTime / stepMillis) * stepMillis;
        long endTime = (maxTime / stepMillis) * stepMillis;

        // 2. Preprocess Data
        double[] y = preprocessor.preprocess(historyData, stepMillis, startTime, endTime);

        // 3. Train Model (Stateful, so create a new instance for each request)
        NLinearModel model = new NLinearModel();
        model.train(y);

        // 4. Forecast
        PredictionResult[] predictions = model.predict(y, forecastCount);

        // 5. Convert and add timestamps
        List<PredictionResult> forecastResult = new ArrayList<>(forecastCount);

        // Use the actual last timestamp from preprocessing as the base for future time
        // Note: endTime calculated above is the timestamp of the last bucket
        long lastTimestamp = endTime;

        for (int i = 0; i < predictions.length; i++) {
            PredictionResult result = predictions[i];

            // Critical: Set the absolute timestamp for the frontend
            // i=0 is the first future point, so time = lastTimestamp + 1 * step
            result.setTime(lastTimestamp + ((i + 1) * stepMillis));

            forecastResult.add(result);
        }

        return forecastResult;
    }
}
