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

package org.dromara.hertzbeat.collector.dispatch.unit.impl;

import org.dromara.hertzbeat.collector.dispatch.unit.TimeLengthUnit;
import org.dromara.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * the convert of time length
 * 时间长短转换
 * @author rbsrcy
 *
 */
@Component
public final class TimeLengthConvert implements UnitConvert {


    @Override
    public String convert(String value, String originUnit, String newUnit) {
        if (value == null || "".equals(value)) {
            return null;
        }
        BigDecimal length = new BigDecimal(value);
        // 思路：value通过originUnit转换为纳秒，在转换为newUnit单位对应的值
        for (TimeLengthUnit timeLengthUnit : TimeLengthUnit.values()) {
            if (timeLengthUnit.getUnit().equals(originUnit.toUpperCase())) {
                length = length.multiply(new BigDecimal(timeLengthUnit.getScale()));
            }
            if (timeLengthUnit.getUnit().equals(newUnit.toUpperCase())) {
                length = length.divide(new BigDecimal(timeLengthUnit.getScale()), 12, RoundingMode.HALF_UP);
            }
        }
        return length.setScale(4, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    @Override
    public boolean checkUnit(String unit) {
        if (unit == null || "".equals(unit)) {
            return false;
        }
        for (TimeLengthUnit timeUnit : TimeLengthUnit.values()) {
            // 不区分大小写
            if (timeUnit.getUnit().equals(unit.toUpperCase())) {
                return true;
            }
        }
        return false;
    }
}
