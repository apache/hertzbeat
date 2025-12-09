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

import org.apache.commons.math3.stat.regression.OLSMultipleLinearRegression;
import org.springframework.stereotype.Component;

/**
 * Lightweight Time Series Forecasting Model (inspired by Prophet's additive model).
 * Uses OLS (Ordinary Least Squares) Regression with Fourier Series features.
 */
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
     * Confidence interval factor (3-Sigma = 99.7%)
     */
    private static final double SIGMA_FACTOR = 3.0;

    /**
     * Trained coefficients (beta)
     */
    private double[] coefficients;

    /**
     * Standard Deviation of residuals (model error)
     */
    private double stdDeviation;

    /**
     * Train the model and calculate error (sigma)
     * @param timePoints Time points (x-axis)
     * @param values Observed values (y-axis)
     */
    public void train(double[] timePoints, double[] values) {
        if (timePoints.length != values.length) {
            throw new IllegalArgumentException("Time points and values length mismatch");
        }

        // Validation: Need enough points to solve OLS
        // Features = Intercept(1) + Trend(1) + Fourier(2*ORDER)
        int numFeatures = 1 + (1 + 2 * FOURIER_ORDER);

        // We need at least (numFeatures + 1) points to have degrees of freedom > 0
        if (timePoints.length < numFeatures + 1) {
            // Not enough data points to fit the model parameters
            return;
        }

        // 1. Build Design Matrix
        // OLS class adds Intercept automatically, so we feed Trend + Fourier columns
        int cols = 1 + (2 * FOURIER_ORDER);
        double[][] x = new double[timePoints.length][cols];

        for (int i = 0; i < timePoints.length; i++) {
            fillFeatures(x[i], timePoints[i]);
        }

        // 2. Solve OLS
        try {
            OLSMultipleLinearRegression regression = new OLSMultipleLinearRegression();
            regression.newSampleData(values, x);
            this.coefficients = regression.estimateRegressionParameters();

            // 3. Calculate Residual Standard Deviation (Sigma)
            double sumSquaredResiduals = 0.0;
            for (int i = 0; i < timePoints.length; i++) {
                double yHat = predictValueOnly(timePoints[i]);
                double residual = values[i] - yHat;
                sumSquaredResiduals += (residual * residual);
            }

            // Degrees of freedom = N - p (where p is total parameters including intercept)
            int df = timePoints.length - (cols + 1);
            if (df > 0) {
                this.stdDeviation = Math.sqrt(sumSquaredResiduals / df);
            } else {
                this.stdDeviation = 0.0;
            }

        } catch (Exception e) {
            // Regression failed (singular matrix, etc.)
            this.coefficients = null;
            this.stdDeviation = 0.0;
        }
    }

    /**
     * Predict future value with confidence interval
     */
    public PredictionResult predict(double t) {
        if (coefficients == null) {
            // Model not trained or failed
            return PredictionResult.builder()
                .forecast(Double.NaN)
                .lowerBound(Double.NaN)
                .upperBound(Double.NaN)
                .build();
        }

        double forecast = predictValueOnly(t);
        double interval = SIGMA_FACTOR * stdDeviation;

        return PredictionResult.builder()
            .forecast(forecast)
            .upperBound(forecast + interval)
            .lowerBound(forecast - interval)
            .build();
    }

    private double predictValueOnly(double t) {
        // coefficients: [0]=Intercept, [1]=Trend, [2]=Sin1, [3]=Cos1, ...
        double prediction = coefficients[0] + coefficients[1] * t;

        for (int k = 1; k <= FOURIER_ORDER; k++) {
            double omega = 2 * Math.PI * k * t / PERIOD;
            int idxSin = 1 + (2 * k - 1);
            int idxCos = 1 + (2 * k);

            if (idxCos < coefficients.length) {
                prediction += coefficients[idxSin] * Math.sin(omega)
                    + coefficients[idxCos] * Math.cos(omega);
            }
        }
        return prediction;
    }

    /**
     * Helper to fill feature row (Trend + Fourier)
     */
    private void fillFeatures(double[] row, double t) {
        row[0] = t; // Trend
        for (int k = 1; k <= FOURIER_ORDER; k++) {
            double omega = 2 * Math.PI * k * t / PERIOD;
            row[2 * k - 1] = Math.sin(omega);
            row[2 * k]     = Math.cos(omega);
        }
    }
}
