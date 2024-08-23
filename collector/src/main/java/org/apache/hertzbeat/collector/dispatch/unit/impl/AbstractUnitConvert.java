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
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;


/**
 * abstract UnitConvert ext
 */
public abstract class AbstractUnitConvert implements UnitConvert {


    public String doPostGenericConvert(String value, String originUnit, String newUnit) {

        BigDecimal length = new BigDecimal(value);

//        List<String> filterPendingMatchedUnits = Lists.newArrayList(originUnit, newUnit)
//            .stream()
//            .filter(StringUtils::isNotBlank)
//            .map(String::toUpperCase)
//            .toList();
//        if (CollectionUtils.isNotEmpty(filterPendingMatchedUnits)) {
        Map<String, Long> unitMap = convertUnitEnumToMap();
        if (unitMap.containsKey(originUnit.toUpperCase())) {
            Long multipleScale = unitMap.get(originUnit.toUpperCase());
            length = length.multiply(new BigDecimal(multipleScale));
        }
        if (unitMap.containsKey(newUnit.toUpperCase())) {
            Long divideScale = unitMap.get(newUnit.toUpperCase());
            length = length.divide(new BigDecimal(divideScale), 12, RoundingMode.HALF_UP);
        }
//        }
        return length.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    @Override
    public boolean checkUnit(String unit) {
        if (StringUtils.isBlank(unit)) {
            return false;
        }
        Map<String, Long> convertedUnitEnumToMap = convertUnitEnumToMap();
        return convertedUnitEnumToMap.containsKey(unit.toUpperCase());
    }

    abstract Map<String, Long> convertUnitEnumToMap();
}
