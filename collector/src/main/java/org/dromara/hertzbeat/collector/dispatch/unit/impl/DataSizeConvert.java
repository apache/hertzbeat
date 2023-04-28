package org.dromara.hertzbeat.collector.dispatch.unit.impl;

import org.dromara.hertzbeat.collector.dispatch.unit.DataUnit;
import org.dromara.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * the convert of data size
 * 数据空间大小转换
 * @author ceilzcx
 *
 */
@Component
public final class DataSizeConvert implements UnitConvert {

    @Override
    public String convert(String value, String originUnit, String newUnit) {
        if (value == null || "".equals(value)) {
            return null;
        }
        BigDecimal size = new BigDecimal(value);
        // 思路：value通过originUnit转换为字节，在转换为newUnit单位对应的值
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
        if (unit == null || "".equals(unit)) {
            return false;
        }
        for (DataUnit dataUnit : DataUnit.values()) {
            // 不区分大小写
            if (dataUnit.getUnit().equals(unit.toUpperCase())) {
                return true;
            }
        }
        return false;
    }
}
