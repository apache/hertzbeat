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

package org.apache.hertzbeat.collector.dispatch.unit.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.dispatch.unit.DataUnit;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.springframework.stereotype.Component;

/**
 * the convert of data size
 */
@Slf4j
@Component
public final class DataSizeConvert implements UnitConvert {

    @Override
    public String convert(String value, String originUnit, String newUnit) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        if (!checkUnit(originUnit) || !checkUnit(newUnit)) {
            return null;
        }
        if (originUnit.equalsIgnoreCase(newUnit)) {
            log.warn("The origin unit is the same as the new unit, no need to convert");
            return value;
        }
        BigDecimal size = new BigDecimal(value);
        // Idea: Value is converted to bytes through origin unit,
        // and then converted to the value corresponding to the new unit unit
        for (DataUnit dataUnit : DataUnit.values()) {
            if (dataUnit.getUnit().equals(originUnit.toUpperCase())) {
                size = size.multiply(new BigDecimal(dataUnit.getScale()));
            }
            if (dataUnit.getUnit().equals(newUnit.toUpperCase())) {
                size = size.divide(new BigDecimal(dataUnit.getScale()), 12, RoundingMode.HALF_UP);
            }
        }
        return size.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    @Override
    public boolean checkUnit(String unit) {
        if (unit == null || unit.isEmpty()) {
            return false;
        }
        for (DataUnit dataUnit : DataUnit.values()) {
            // not case-sensitive
            if (dataUnit.getUnit().equals(unit.toUpperCase())) {
                return true;
            }
        }
        return false;
    }
}
