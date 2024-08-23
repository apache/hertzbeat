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

import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.dispatch.unit.TimeLengthUnit;
import org.springframework.stereotype.Component;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * the convert of time length
 */
@Component
public final class TimeLengthConvert extends AbstractUnitConvert {


    /**
     * @param value      value
     * @param originUnit through origin unit,value is converted to nanoseconds .
     * @param newUnit    converted to the value corresponding to the new unit
     * @return converted value if necessary
     */
    @Override
    public String convert(String value, String originUnit, String newUnit) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
//        BigDecimal length = new BigDecimal(value);
//        // Idea: Value is converted to nanoseconds through origin unit,
//        // and then converted to the value corresponding to the new unit unit
//        for (TimeLengthUnit timeLengthUnit : TimeLengthUnit.values()) {
//            if (timeLengthUnit.getUnit().equals(originUnit.toUpperCase())) {
//                length = length.multiply(new BigDecimal(timeLengthUnit.getScale()));
//            }
//            if (timeLengthUnit.getUnit().equals(newUnit.toUpperCase())) {
//                length = length.divide(new BigDecimal(timeLengthUnit.getScale()), 12, RoundingMode.HALF_UP);
//            }
//        }
//        return length.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
//
//
//
        return doPostGenericConvert(value, originUnit, newUnit);
    }

    @Override
    Map<String, Long> convertUnitEnumToMap() {
        return Arrays.stream(TimeLengthUnit.values())
            .collect(Collectors.toMap(TimeLengthUnit::getUnit, TimeLengthUnit::getScale));
    }


}
