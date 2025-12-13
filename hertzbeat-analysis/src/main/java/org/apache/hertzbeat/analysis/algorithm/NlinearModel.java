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

/**
 * Industrial-grade Robust NLinear Model.
 * Uses Ridge Regression (L2 Regularization) to prevent overfitting and handle singular matrices.
 * Note: This class is stateful and not thread-safe. A new instance should be created for each prediction task.
 */
public class NlinearModel {

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
        if (historyValues == null || historyValues.length == 0) {
            return;
        }

        // 1. Critical Fix: Always capture the last value first.
        // This ensures that even if we don't have enough data to train the full model,
        // we can still fallback to a naive "last-value" prediction instead of returning 0.
        this.lastValue = historyValues[historyValues.length - 1];

        // Check if we have enough data for the sliding window approach
        if (historyValues.length < LOOKBACK_WINDOW + 5) {
            // Fallback: Calculate simple standard deviation for confidence interval
            if (historyValues.length > 1) {
                StandardDeviation stdDevCalc = new StandardDeviation();
                this.stdDeviation = stdDevCalc.evaluate(historyValues);
            } else {
                this.stdDeviation = 0.0;
            }
            return;
        }

        // 2. Pre-check: Flat Line Detection
        // If variance is 0 (or very close), logic is simple: prediction = last value
        StandardDeviation stdDevCalc = new StandardDeviation();
        double historyStd = stdDevCalc.evaluate(historyValues);
        if (historyStd < 0.0001) {
            this.isFlatLine = true;
            this.stdDeviation = 0.0;
            return;
        }
        this.isFlatLine = false;

        // 3. Prepare Data for Ridge Regression
        int n = historyValues.length;
        int numSamples = n - LOOKBACK_WINDOW;
        int numFeatures = LOOKBACK_WINDOW + 1; // +1 for Intercept

        // Matrix X: [Samples x Features]
        // Vector Y: [Samples]
        double[][] inputSamples = new double[numSamples][numFeatures];
        double[] targetValues = new double[numSamples];

        for (int i = 0; i < numSamples; i++) {
            double target = historyValues[i + LOOKBACK_WINDOW];
            double anchorValue = historyValues[i + LOOKBACK_WINDOW - 1]; // RevIN anchor

            targetValues[i] = target - anchorValue; // Normalize Y

            // Intercept term (always 1.0)
            inputSamples[i][0] = 1.0;

            // Features (Past L points)
            for (int j = 0; j < LOOKBACK_WINDOW; j++) {
                inputSamples[i][j + 1] = historyValues[i + j] - anchorValue; // Normalize X
            }
        }

        // 4. Solve Ridge Regression: W = (X'X + lambda*I)^-1 * X'Y
        try {
            RealMatrix designMatrix = new Array2DRowRealMatrix(inputSamples);
            RealVector targetVector = new ArrayRealVector(targetValues);

            RealMatrix transposedMatrix = designMatrix.transpose();
            RealMatrix gramMatrix = transposedMatrix.multiply(designMatrix);

            // Add Lambda to Diagonal (Ridge Regularization)
            for (int i = 0; i < numFeatures; i++) {
                gramMatrix.addToEntry(i, i, RIDGE_LAMBDA);
            }

            // Solve
            RealVector momentVector = transposedMatrix.operate(targetVector);
            // LUDecomposition is fast and stable for square matrices
            RealVector weightVector = new LUDecomposition(gramMatrix).getSolver().solve(momentVector);

            this.weights = weightVector.toArray();

            // 5. Calculate Training Error (Residual StdDev)
            double sumSquaredErrors = 0.0;
            for (int i = 0; i < numSamples; i++) {
                double prediction = 0.0;
                for (int j = 0; j < numFeatures; j++) {
                    prediction += inputSamples[i][j] * weights[j];
                }
                double error = targetValues[i] - prediction;
                sumSquaredErrors += error * error;
            }
            // StdDev of residuals
            this.stdDeviation = Math.sqrt(sumSquaredErrors / numSamples);

        } catch (RuntimeException e) {
            // Fallback strategy: just predict the last value
            this.isFlatLine = true;
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
            // Should not happen if training succeeded, but as a safeguard
            return new PredictionResult[0];
        }

        PredictionResult[] results = new PredictionResult[steps];
        double[] buffer = Arrays.copyOfRange(recentHistory, recentHistory.length - LOOKBACK_WINDOW, recentHistory.length);

        for (int i = 0; i < steps; i++) {
            double anchorValue = buffer[buffer.length - 1];

            // Apply Weights
            // weights[0] is Intercept
            double predictionNorm = weights[0];

            for (int j = 0; j < LOOKBACK_WINDOW; j++) {
                double feat = buffer[j] - anchorValue; // RevIN
                predictionNorm += weights[j + 1] * feat;
            }

            double prediction = predictionNorm + anchorValue;
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
