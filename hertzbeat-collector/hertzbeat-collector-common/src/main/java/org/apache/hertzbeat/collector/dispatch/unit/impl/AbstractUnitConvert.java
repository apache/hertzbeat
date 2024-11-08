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

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * abstract UnitConvert
 */
@Slf4j
public abstract class AbstractUnitConvert implements UnitConvert {


    @Override
    public String convert(String value, String originUnit, String newUnit) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        if (!checkUnit(originUnit) || !checkUnit(newUnit)) {
            return null;
        }

        if (originUnit.equalsIgnoreCase(newUnit)) {
            log.warn("The origin unit is the same as the new unit, no need to convert");
            return value;
        }
        BigDecimal wrappedValue = new BigDecimal(value);

        Map<String, Long> unitMap = convertUnitEnumToMap();

        //There is no need to check again,as both the originUnit and newUnit have already been checked for existence.
        Long multipleScale = unitMap.get(originUnit.toUpperCase());
        wrappedValue = wrappedValue.multiply(new BigDecimal(multipleScale));

        Long divideScale = unitMap.get(newUnit.toUpperCase());
        wrappedValue = wrappedValue.divide(new BigDecimal(divideScale), 12, RoundingMode.HALF_UP);

        return wrappedValue.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    @Override
    public boolean checkUnit(String unit) {
        if (StringUtils.isBlank(unit)) {
            return false;
        }
        Map<String, Long> convertedUnitEnumToMap = convertUnitEnumToMap();
        return convertedUnitEnumToMap.containsKey(unit.toUpperCase());
    }

    /***
     * this method can be used to convert   specific enum to map by the Inherited class
     */
    abstract Map<String, Long> convertUnitEnumToMap();
}
