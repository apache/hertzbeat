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

import java.util.Arrays;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.stat.descriptive.moment.StandardDeviation;
import org.springframework.stereotype.Component;

/**
 * Industrial-grade Robust NLinear Model.
 * Uses Ridge Regression (L2 Regularization) to prevent overfitting and handle singular matrices.
 */
@Component
public class NLinearModel {

    private static final int LOOKBACK_WINDOW = 30;

    /**
     * Ridge regularization parameter (Lambda).
     * A small positive value ensures the matrix is always invertible.
     */
    private static final double RIDGE_LAMBDA = 0.01;

    private double[] weights;
    private double stdDeviation;
    private boolean isFlatLine = false;
    private double lastValue = 0.0;

    public void train(double[] historyValues) {
        if (historyValues == null || historyValues.length < LOOKBACK_WINDOW + 5) {
            return;
        }

        // 1. Pre-check: Flat Line Detection
        // If variance is 0 (or very close), logic is simple: prediction = last value
        StandardDeviation stdDevCalc = new StandardDeviation();
        double historyStd = stdDevCalc.evaluate(historyValues);
        if (historyStd < 0.0001) {
            this.isFlatLine = true;
            this.lastValue = historyValues[historyValues.length - 1];
            this.stdDeviation = 0.0;
            return;
        }
        this.isFlatLine = false;

        // 2. Prepare Data for Ridge Regression
        int n = historyValues.length;
        int numSamples = n - LOOKBACK_WINDOW;
        int numFeatures = LOOKBACK_WINDOW + 1; // +1 for Intercept

        // Matrix X: [Samples x Features]
        // Vector Y: [Samples]
        double[][] xData = new double[numSamples][numFeatures];
        double[] yData = new double[numSamples];

        for (int i = 0; i < numSamples; i++) {
            double target = historyValues[i + LOOKBACK_WINDOW];
            double xLast = historyValues[i + LOOKBACK_WINDOW - 1]; // RevIN anchor

            yData[i] = target - xLast; // Normalize Y

            // Intercept term (always 1.0)
            xData[i][0] = 1.0;

            // Features (Past L points)
            for (int j = 0; j < LOOKBACK_WINDOW; j++) {
                xData[i][j + 1] = historyValues[i + j] - xLast; // Normalize X
            }
        }

        // 3. Solve Ridge Regression: W = (X'X + lambda*I)^-1 * X'Y
        try {
            RealMatrix X = new Array2DRowRealMatrix(xData);
            RealVector Y = new ArrayRealVector(yData);

            RealMatrix XTrans = X.transpose();
            RealMatrix XTransX = XTrans.multiply(X);

            // Add Lambda to Diagonal (Ridge Regularization)
            for (int i = 0; i < numFeatures; i++) {
                XTransX.addToEntry(i, i, RIDGE_LAMBDA);
            }

            // Solve
            RealVector XTransY = XTrans.operate(Y);
            // LUDecomposition is fast and stable for square matrices
            RealVector W = new LUDecomposition(XTransX).getSolver().solve(XTransY);

            this.weights = W.toArray();

            // 4. Calculate Training Error (Residual StdDev)
            double sumSquaredErrors = 0.0;
            for (int i = 0; i < numSamples; i++) {
                double prediction = 0.0;
                for (int j = 0; j < numFeatures; j++) {
                    prediction += xData[i][j] * weights[j];
                }
                double error = yData[i] - prediction;
                sumSquaredErrors += error * error;
            }
            // StdDev of residuals
            this.stdDeviation = Math.sqrt(sumSquaredErrors / numSamples);

        } catch (RuntimeException e) {
            // Fallback strategy: just predict the last value
            this.isFlatLine = true;
            this.lastValue = historyValues[historyValues.length - 1];
            this.stdDeviation = historyStd; // Use global std as uncertainty
        }
    }

    public PredictionResult[] predict(double[] recentHistory, int steps) {
        // If untrained or logic fallback
        if (isFlatLine || weights == null) {
            PredictionResult[] results = new PredictionResult[steps];
            for (int i = 0; i < steps; i++) {
                results[i] = PredictionResult.builder()
                    .forecast(lastValue)
                    .upperBound(lastValue + 3 * stdDeviation)
                    .lowerBound(lastValue - 3 * stdDeviation)
                    .build();
            }
            return results;
        }

        if (recentHistory.length < LOOKBACK_WINDOW) {
            return new PredictionResult[0];
        }

        PredictionResult[] results = new PredictionResult[steps];
        double[] buffer = Arrays.copyOfRange(recentHistory, recentHistory.length - LOOKBACK_WINDOW, recentHistory.length);

        for (int i = 0; i < steps; i++) {
            double xLast = buffer[buffer.length - 1];

            // Apply Weights
            // weights[0] is Intercept
            double predictionNorm = weights[0];

            for (int j = 0; j < LOOKBACK_WINDOW; j++) {
                double feat = buffer[j] - xLast; // RevIN
                predictionNorm += weights[j + 1] * feat;
            }

            double prediction = predictionNorm + xLast;
            double interval = 3.0 * stdDeviation;

            results[i] = PredictionResult.builder()
                .forecast(prediction)
                .upperBound(prediction + interval)
                .lowerBound(prediction - interval)
                .build();

            // Slide buffer
            System.arraycopy(buffer, 1, buffer, 0, LOOKBACK_WINDOW - 1);
            buffer[LOOKBACK_WINDOW - 1] = prediction;
        }
        return results;
    }
}
