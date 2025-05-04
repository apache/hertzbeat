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

package org.apache.hertzbeat.automated.testing.pages.monitoring.monitors;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.monitoring.MonitorsNavPage;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.manager.service.impl.AppServiceImpl;
import org.dflib.DataFrame;
import org.dflib.Extractor;
import org.dflib.Printers;
import org.dflib.Series;
import org.dflib.builder.SeriesAppender;
import org.junit.jupiter.api.function.Executable;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Map;
import java.util.stream.IntStream;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.NONE;
import static org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage.EMPTY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Monitors Detail Page
 */
@Slf4j
@PageInfo(
        selector = EMPTY,
        selectorType = NONE,
        urlPart = "/monitors/"
)
public class MonitorsDetailPage extends NavBarPage implements MonitorsNavPage.InnerTab {

    public By monitorRealTimeDetailBtn  = By.xpath("//button[contains(text(), 'Monitor Real-Time Detail')]");
    public By monitorHistoricalChartDetailBtn = By.xpath("//button[contains(text(), 'Monitor Historical Chart Detail')]");

    private final List<String> filterMonitor = new ArrayList<>();

    public MonitorsDetailPage addFilterMonitorOptions(String... filterMonitorOptions) {
        this.filterMonitor.addAll(Arrays.asList(filterMonitorOptions));
        return this;
    }

    public MonitorsDetailPage(RemoteWebDriver driver) {
        super(driver);
    }

    public MonitorsDetailPage clickRealTimeDetailBtn() {
        clickAction(monitorRealTimeDetailBtn);
        return this;
    }

    public MonitorsDetailPage clickHistoricalChartDetailBtn() {
        clickAction(monitorHistoricalChartDetailBtn);
        return this;
    }

    public List<Executable> testRealTimeDetail(String app) {
        Job job = loadAppDefines(app.toLowerCase());
        List<Executable> assertions = new ArrayList<>();

        List<Metrics> metricsList = job.getMetrics();
        for (int i = 0; i < metricsList.size(); i++) {
            Metrics metrics = metricsList.get(i);

            String metricNameIndex = String.format("//app-monitor-data-table[%d]/nz-card/div[1]/div/div[1]/p", i + 2);
            By metricNameBy = By.xpath(metricNameIndex);
            String frontMetricName = waitForVisibility(metricNameBy).getText().trim();

            boolean exists = metricsList.stream()
                    .map(map -> map.getI18n().get("en-US"))
                    .filter(Objects::nonNull)
                    .anyMatch(map -> map.equals(frontMetricName));
            assertions.add(() -> assertTrue(exists, frontMetricName + " monitor metric do not exist."));
            if (!exists) {
                log.info("The monitor metric do not exist: {}", frontMetricName);
                continue;
            }

            boolean contains = filterMonitor.contains(frontMetricName);
            if (contains) {
                log.info("Manually filter the monitor metric: {}", frontMetricName);
                continue;
            }

            ArrayList<String> headerList = new ArrayList<>();
            ArrayList<Series<String>> seriesList = new ArrayList<>();
            List<Metrics.Field> metricsFieldsList = metrics.getFields();

            String headerFirstIndex = String.format("//app-monitor-data-table[%d]/nz-card/div[2]/nz-table/nz-spin"
                    + "/div/div/nz-table-inner-scroll/div[1]/table/thead/tr/th[1]", i + 2);
            String headerFirstIndexText = driver.findElement(By.xpath(headerFirstIndex)).getText();
            int metricsFieldsListSize = "Metric Name".equals(headerFirstIndexText) ? 2 : metricsFieldsList.size();
            boolean metricHeadersMark = !"Metric Name".equals(headerFirstIndexText);

            for (int j = 0; j < metricsFieldsListSize; j++) {
                SeriesAppender<String, String> appender = Series
                        .byElement(Extractor.<String>$col())
                        .appender();

                String metricFieldsHeaderIndex = String.format("//app-monitor-data-table[%d]/nz-card/div[2]/nz-table/nz-spin"
                        + "/div/div/nz-table-inner-scroll/div[1]/table/thead/tr/th[%d]", i + 2, j + 1);
                By metricFieldsHeaderBy = By.xpath(metricFieldsHeaderIndex);
                for (WebElement webElement : driver.findElements(metricFieldsHeaderBy)) {
                    String frontMetricHeaderText = webElement.getText();
                    Optional.ofNullable(frontMetricHeaderText)
                            .filter(text -> !text.trim().isEmpty())
                            .ifPresent(headerList::add);
                }

                String metricFieldsIndex = String.format("//app-monitor-data-table[%d]/nz-card/div[2]/nz-table/nz-spin"
                        + "/div/div/nz-table-inner-scroll/div[2]/table/tbody/tr/td[%d]", i + 2, j + 1);
                By metricFieldsBy = By.xpath(metricFieldsIndex);
                for (WebElement webElement : driver.findElements(metricFieldsBy)) {
                    String frontMetricFieldText = webElement.getText();
                    Optional.ofNullable(frontMetricFieldText)
                            .filter(text -> !text.trim().isEmpty())
                            .ifPresent(appender::append);
                }

                if (appender.size() != 0) {
                    Series<String> series = appender.toSeries();
                    seriesList.add(series);
                }
            }

            DataFrame frontMetricDataFrame = DataFrame
                    .byColumn(headerList.toArray(new String[0]))
                    .of(seriesList.toArray(new Series[0]));
            String frontMetric = Printers.tabular(10, 125).toString(frontMetricDataFrame);
            log.info("\n" + frontMetricName + frontMetric);

            int dfIndexSize = frontMetricDataFrame.getColumnsIndex().size();
            int dfFirstColHeight = frontMetricDataFrame.cols(0).select().height();
            int metricSize = metricsFieldsList.size();
            if (metricHeadersMark) {
                assertions.add(() -> assertEquals(metricSize, dfIndexSize, "Error in the Number of monitor metric fields."));

                IntStream.range(0, dfIndexSize).forEach(index -> {
                    String frontField = frontMetricDataFrame.getColumnsIndex().get(index);
                    String metricField = concatMetricField(metricsFieldsList, index);
                    assertions.add(() -> assertEquals(metricField, frontField, metricField + " Name is incorrect."));
                });
            } else {
                assertions.add(() -> assertEquals(metricSize, dfFirstColHeight, "Error in the Number of monitor metric fields."));

                DataFrame rowProxies = frontMetricDataFrame.cols(0).select();
                IntStream.range(0, dfFirstColHeight).forEach(index -> {
                    String rowValue = (String) rowProxies.get(0, index);
                    String metricField = concatMetricField(metricsFieldsList, index);
                    assertions.add(() -> assertEquals(metricField, rowValue, metricField + " Name is incorrect."));
                });
            }

            for (String columnName : frontMetricDataFrame.getColumnsIndex()) {
                Series<?> columnSeries = frontMetricDataFrame.getColumn(columnName);
                IntStream.range(0, columnSeries.size()).forEach(index -> {
                    Object columnValue = columnSeries.get(index);
                    assertions.add(() -> assertTrue(Objects.nonNull(columnValue),
                            columnName + ": " + index + " row, " + columnValue + " is null."));
                });
            }
        }
        return assertions;
    }

    private String concatMetricField(List<Metrics.Field> metricsFieldsList, int index) {
        try {
            Metrics.Field metricField = metricsFieldsList.get(index);
            String field = metricField.getI18n().get("en-US");
            String unit = metricField.getUnit();
            unit = unit == null ? "" : " " + unit;
            return field + unit;
        } catch (IndexOutOfBoundsException e) {
            log.error("concat metric field error", e);
            return null;
        }
    }

    private Map<String, Job> loadAppDefines() throws InvocationTargetException, InstantiationException, IllegalAccessException, NoSuchMethodException {
        AppServiceImpl appService = new AppServiceImpl();
        Class<?> appServiceImplClass = AppServiceImpl.class;
        Class<?>[] declaredClasses = appServiceImplClass.getDeclaredClasses();

        Class<?> appDefineStoreClass = null;
        for (Class<?> declared : declaredClasses) {
            if (declared.getSimpleName().equals("JarAppDefineStoreImpl")) {
                appDefineStoreClass = declared;
                break;
            }
        }

        if (appDefineStoreClass != null) {
            Constructor<?> appDefineStoreConstructor = appDefineStoreClass.getDeclaredConstructor(appServiceImplClass);
            appDefineStoreConstructor.setAccessible(true);
            Object appDefineStoreInstance = appDefineStoreConstructor.newInstance(appService);

            Method getMessageMethod = appDefineStoreInstance.getClass().getDeclaredMethod("loadAppDefines");
            getMessageMethod.setAccessible(true);
            Object result = getMessageMethod.invoke(appDefineStoreInstance);
            log.debug("loadAppDefines method returns result: " + result);

            return appService.getAllAppDefines();
        }
        return null;
    }

    private Job loadAppDefines(String app) {
        try {
            Map<String, Job> jobMap = loadAppDefines();
            return Objects.requireNonNull(jobMap).getOrDefault(app, null);
        } catch (InvocationTargetException | InstantiationException | IllegalAccessException | NoSuchMethodException e) {
            log.error("define/app-{}.yml file parsing error: ", app.toLowerCase());
            throw new RuntimeException(e);
        }
    }

}
