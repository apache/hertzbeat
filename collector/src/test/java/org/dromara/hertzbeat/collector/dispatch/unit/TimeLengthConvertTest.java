package org.dromara.hertzbeat.collector.dispatch.unit;

import org.dromara.hertzbeat.collector.dispatch.unit.impl.TimeLengthConvert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Test case for {@link TimeLengthConvert}
 */
class TimeLengthConvertTest {

    private TimeLengthConvert convert;

    @BeforeEach
    void setUp() {
        this.convert = new TimeLengthConvert();
    }

    /**
     * 测试纳秒转秒
     */
    @Test
    void convertNs2Sec() {
        String result = convert.convert("1000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.S.getUnit());
        assertEquals("1", result);
    }

    /**
     * 测试纳秒转毫秒
     */
    @Test
    void convertNs2Ms() {
        String result = convert.convert("1000123450", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.MS.getUnit());
        assertEquals("1000.1235", result);
    }

    /**
     * 测试纳秒转微秒
     */
    @Test
    void convertNs2Us() {
        String result = convert.convert("1000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.US.getUnit());
        assertEquals("1000000", result);
    }


    /**
     * 测试纳秒转天
     */
    @Test
    void convertNs2Day() {
        String result = convert.convert("86400000000000", TimeLengthUnit.NS.getUnit(), TimeLengthUnit.D.getUnit());
        assertEquals("1", result);
    }


}