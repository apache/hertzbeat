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

package org.apache.hertzbeat.analysis.algorithm;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import org.apache.hertzbeat.common.entity.warehouse.History;
import org.springframework.stereotype.Component;

/**
 * Time series data preprocessing tool: Resampling & Interpolation
 */
@Component
public class TimeSeriesPreprocessor {

    /**
     * Preprocess raw metric data into a fixed-step, gap-filled double array
     * @param rawData Raw history data list
     * @param stepMillis Time step in milliseconds (e.g., 60000 for 1 minute)
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return Cleaned data array where index 0 corresponds to startTime
     */
    public double[] preprocess(List<History> rawData, long stepMillis, long startTime, long endTime) {
        if (rawData == null || rawData.isEmpty()) {
            return new double[0];
        }

        // 1. Bucket Aggregation (Snap to Grid)
        TreeMap<Long, List<Double>> buckets = new TreeMap<>();
        for (History point : rawData) {
            long timestamp = point.getTime();
            if (timestamp < startTime || timestamp > endTime) {
                continue;
            }
            // Align timestamp to the grid
            long bucketTime = ((timestamp - startTime) / stepMillis) * stepMillis + startTime;
            buckets.computeIfAbsent(bucketTime, k -> new ArrayList<>()).add(point.getDou());
        }

        // 2. Generate Grid and Impute Missing Values
        int expectedSize = (int) ((endTime - startTime) / stepMillis) + 1;
        double[] result = new double[expectedSize];

        Double lastValidValue = null;
        int lastValidIndex = -1;

        for (int i = 0; i < expectedSize; i++) {
            long currentTime = startTime + (i * stepMillis);

            if (buckets.containsKey(currentTime)) {
                // If bucket has data, take average
                double avg = buckets.get(currentTime).stream()
                    .mapToDouble(Double::doubleValue).average().orElse(0.0);
                result[i] = avg;

                // Perform linear interpolation for gaps
                if (lastValidValue != null && (i - lastValidIndex) > 1) {
                    fillGap(result, lastValidIndex, i, lastValidValue, avg);
                }

                lastValidValue = avg;
                lastValidIndex = i;
            } else {
                // Mark as NaN for now
                result[i] = Double.NaN;
            }
        }

        // 3. Handle Edge Cases (Forward/Backward Fill)
        fillEdges(result);

        return result;
    }

    /**
     * Linear interpolation
     */
    private void fillGap(double[] data, int startIndex, int endIndex, double startVal, double endVal) {
        int steps = endIndex - startIndex;
        double slope = (endVal - startVal) / steps;

        for (int i = 1; i < steps; i++) {
            data[startIndex + i] = startVal + (slope * i);
        }
    }

    /**
     * Fill leading/trailing NaNs
     */
    private void fillEdges(double[] data) {
        if (data.length == 0) {
            return;
        }

        // Forward Fill (Head)
        int firstValid = -1;
        for (int i = 0; i < data.length; i++) {
            if (!Double.isNaN(data[i])) {
                firstValid = i;
                break;
            }
        }

        if (firstValid == -1) {
            return; // All NaN
        }
        for (int i = 0; i < firstValid; i++) {
            data[i] = data[firstValid];
        }

        // Backward Fill (Tail)
        for (int i = firstValid + 1; i < data.length; i++) {
            if (Double.isNaN(data[i])) {
                data[i] = data[i - 1];
            }
        }
    }
}
