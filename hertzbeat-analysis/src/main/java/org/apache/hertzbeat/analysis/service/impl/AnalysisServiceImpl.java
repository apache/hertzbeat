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
import org.apache.hertzbeat.analysis.algorithm.PredictionResult;
import org.apache.hertzbeat.analysis.algorithm.TimeSeriesPreprocessor;
import org.apache.hertzbeat.analysis.algorithm.TinyProphet;
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

    @Autowired
    private TinyProphet prophetModel;

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

        // 3. Prepare Time Points (x)
        double[] x = new double[y.length];
        for (int i = 0; i < y.length; i++) {
            x[i] = i;
        }

        // 4. Train Model (Calculates coefficients and sigma)
        prophetModel.train(x, y);

        // 5. Forecast
        List<PredictionResult> forecastResult = new ArrayList<>(forecastCount);
        int lastIndex = x.length - 1;
        for (int i = 1; i <= forecastCount; i++) {
            double futureT = lastIndex + i;
            // Now predict() returns object with upper/lower bounds
            PredictionResult result = prophetModel.predict(futureT);
            forecastResult.add(result);
        }

        return forecastResult;
    }
}
