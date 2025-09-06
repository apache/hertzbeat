package org.apache.hertzbeat.collector.dispatch.unit;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 *
 */
@Data
@AllArgsConstructor
public class UnitConverter {
    private List<UnitConvert> unitConvertList;
}
