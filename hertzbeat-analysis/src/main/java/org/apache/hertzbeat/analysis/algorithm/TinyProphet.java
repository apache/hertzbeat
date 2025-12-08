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

import lombok.Getter;
import org.apache.commons.math3.stat.regression.OLSMultipleLinearRegression;
import org.springframework.stereotype.Component;

/**
 * Lightweight Time Series Forecasting Model (inspired by Prophet's additive model).
 * Uses OLS (Ordinary Least Squares) Regression with Fourier Series features.
 */
@Getter
@Component
public class TinyProphet {

    /**
     * Fourier order (default 3 is usually good for daily seasonality)
     */
    private static final int FOURIER_ORDER = 3;

    /**
     * Period length (e.g., 1 day in the unit of data steps)
     * If step is 1 min, period = 1440
     */
    private static final double PERIOD = 1440.0;

    /**
     * Trained coefficients (beta)
     */
    private double[] coefficients;

    /**
     * Train the model
     * @param timePoints Time points (x axis, e.g., 0, 1, 2...)
     * @param values Observed values (y axis)
     */
    public void train(double[] timePoints, double[] values) {
        if (timePoints.length != values.length) {
            throw new IllegalArgumentException("Time points and values length mismatch");
        }
        if (timePoints.length < (1 + 2 * FOURIER_ORDER)) {
            // Not enough data points to solve regression
            return;
        }

        // 1. Build Design Matrix (Features)
        // Col 0: Trend t
        // Col 1..N: Fourier terms
        int numFeatures = 1 + (2 * FOURIER_ORDER);
        double[][] x = new double[timePoints.length][numFeatures];

        for (int i = 0; i < timePoints.length; i++) {
            double t = timePoints[i];

            // Feature 0: Linear Trend
            x[i][0] = t;

            // Features 1~N: Fourier Seasonality
            for (int k = 1; k <= FOURIER_ORDER; k++) {
                double omega = 2 * Math.PI * k * t / PERIOD;
                x[i][2 * k - 1] = Math.sin(omega);
                x[i][2 * k]     = Math.cos(omega);
            }
        }

        // 2. Solve OLS (Least Squares)
        try {
            OLSMultipleLinearRegression regression = new OLSMultipleLinearRegression();
            regression.newSampleData(values, x);
            this.coefficients = regression.estimateRegressionParameters();
        } catch (Exception e) {
            // Matrix singularity or not enough data
            this.coefficients = null;
        }
    }

    /**
     * Predict future value
     * @param t Future time point
     * @return Predicted value
     */
    public double predict(double t) {
        if (coefficients == null) {
            return Double.NaN;
        }

        // coefficients[0] is Intercept
        double prediction = coefficients[0];

        // Add Linear Trend: beta1 * t
        prediction += coefficients[1] * t;

        // Add Seasonality
        for (int k = 1; k <= FOURIER_ORDER; k++) {
            double omega = 2 * Math.PI * k * t / PERIOD;
            double betaSin = coefficients[1 + (2 * k - 1)];
            double betaCos = coefficients[1 + (2 * k)];

            prediction += betaSin * Math.sin(omega) + betaCos * Math.cos(omega);
        }

        return prediction;
    }

}
