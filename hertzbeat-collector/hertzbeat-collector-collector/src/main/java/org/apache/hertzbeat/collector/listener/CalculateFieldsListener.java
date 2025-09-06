package org.apache.hertzbeat.collector.listener;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.dispatch.unit.UnitConvert;
import org.apache.hertzbeat.collector.handler.ContextBoundListener;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.hertzbeat.common.util.JexlExpressionRunner;
import org.apache.hertzbeat.common.util.Pair;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 *
 */
@Slf4j
@AllArgsConstructor
public class CalculateFieldsListener implements ContextBoundListener<CollectRep.MetricsData.Builder> {
    private List<UnitConvert> unitConvertList;

    @Override
    public void execute(Context context, CollectRep.MetricsData.Builder data) {
        Metrics metrics = context.get(ContextKey.METRICS);

        this.calculateFields(metrics, unitConvertList, data);
    }

    /**
     * Calculate the real metrics value according to the calculates and aliasFields configuration
     *
     * @param metrics     Metrics configuration
     * @param collectData Data collection
     */
    private void calculateFields(Metrics metrics, List<UnitConvert> unitConvertList, CollectRep.MetricsData.Builder collectData) {
        collectData.setPriority(metrics.getPriority());
        List<CollectRep.Field> fieldList = new LinkedList<>();
        for (Metrics.Field field : metrics.getFields()) {
            CollectRep.Field.Builder fieldBuilder = CollectRep.Field.newBuilder();
            fieldBuilder.setName(field.getField()).setType(field.getType()).setLabel(field.isLabel());
            if (field.getUnit() != null) {
                fieldBuilder.setUnit(field.getUnit());
            }
            fieldList.add(fieldBuilder.build());
        }
        collectData.addAllFields(fieldList);
        List<CollectRep.ValueRow> aliasRowList = collectData.getValuesList();
        if (aliasRowList == null || aliasRowList.isEmpty()) {
            return;
        }
        collectData.clearValues();
        // Preprocess calculates first
        if (metrics.getCalculates() == null) {
            metrics.setCalculates(Collections.emptyList());
        }
        // eg: database_pages=Database pages unconventional mapping
        Map<String, String> fieldAliasMap = new HashMap<>(8);
        Map<String, JexlExpression> fieldExpressionMap = metrics.getCalculates()
                .stream()
                .map(cal -> transformCal(cal, fieldAliasMap))
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (JexlExpression) arr[1], (oldValue, newValue) -> newValue));

        if (metrics.getUnits() == null) {
            metrics.setUnits(Collections.emptyList());
        }
        Map<String, Pair<String, String>> fieldUnitMap = metrics.getUnits()
                .stream()
                .map(this::transformUnit)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> (Pair<String, String>) arr[1], (oldValue, newValue) -> newValue));

        List<Metrics.Field> fields = metrics.getFields();
        List<String> aliasFields = Optional.ofNullable(metrics.getAliasFields()).orElseGet(Collections::emptyList);
        Map<String, String> aliasFieldValueMap = new HashMap<>(8);
        Map<String, Object> fieldValueMap = new HashMap<>(8);
        Map<String, Object> stringTypefieldValueMap = new HashMap<>(8);
        Map<String, String> aliasFieldUnitMap = new HashMap<>(8);
        CollectRep.ValueRow.Builder realValueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (CollectRep.ValueRow aliasRow : aliasRowList) {
            for (int aliasIndex = 0; aliasIndex < aliasFields.size(); aliasIndex++) {
                String aliasFieldValue = aliasRow.getColumns(aliasIndex);
                String aliasField = aliasFields.get(aliasIndex);
                if (!CommonConstants.NULL_VALUE.equals(aliasFieldValue)) {
                    aliasFieldValueMap.put(aliasField, aliasFieldValue);
                    // whether the alias field is a number
                    CollectUtil.DoubleAndUnit doubleAndUnit = CollectUtil
                            .extractDoubleAndUnitFromStr(aliasFieldValue);
                    if (doubleAndUnit != null && doubleAndUnit.getValue() != null) {
                        fieldValueMap.put(aliasField, doubleAndUnit.getValue());
                        if (doubleAndUnit.getUnit() != null) {
                            aliasFieldUnitMap.put(aliasField, doubleAndUnit.getUnit());
                        }
                    } else {
                        fieldValueMap.put(aliasField, aliasFieldValue);
                    }
                    stringTypefieldValueMap.put(aliasField, aliasFieldValue);
                } else {
                    fieldValueMap.put(aliasField, null);
                    stringTypefieldValueMap.put(aliasField, null);
                }
            }

            for (Metrics.Field field : fields) {
                String realField = field.getField();
                JexlExpression expression = fieldExpressionMap.get(realField);
                String value = null;
                String aliasFieldUnit = null;
                if (expression != null) {
                    try {
                        Map<String, Object> context;
                        if (CommonConstants.TYPE_STRING == field.getType()) {
                            context = stringTypefieldValueMap;
                        } else {
                            for (Map.Entry<String, String> unitEntry : aliasFieldUnitMap.entrySet()) {
                                if (expression.getSourceText().contains(unitEntry.getKey())) {
                                    aliasFieldUnit = unitEntry.getValue();
                                    break;
                                }
                            }
                            context = fieldValueMap;
                        }

                        // Also executed when valueList is empty, covering pure string assignment expressions
                        Object objValue = JexlExpressionRunner.evaluate(expression, context);

                        if (objValue != null) {
                            value = String.valueOf(objValue);
                        }
                    } catch (Exception e) {
                        log.warn("[calculates execute warning, use original value.] {}", e.getMessage());
                        value = Optional.ofNullable(fieldValueMap.get(expression.getSourceText()))
                                .map(String::valueOf)
                                .orElse(null);
                    }
                } else {
                    // does not exist then map the alias value
                    String aliasField = fieldAliasMap.get(realField);
                    if (aliasField != null) {
                        value = aliasFieldValueMap.get(aliasField);
                    } else {
                        value = aliasFieldValueMap.get(realField);
                    }

                    if (value != null) {
                        final byte fieldType = field.getType();
                        if (fieldType == CommonConstants.TYPE_NUMBER) {
                            CollectUtil.DoubleAndUnit doubleAndUnit = CollectUtil
                                    .extractDoubleAndUnitFromStr(value);
                            final Double tempValue = doubleAndUnit == null ? null : doubleAndUnit.getValue();
                            value = tempValue == null ? null : String.valueOf(tempValue);
                            aliasFieldUnit = doubleAndUnit == null ? null : doubleAndUnit.getUnit();
                        } else if (fieldType == CommonConstants.TYPE_TIME) {
                            final int tempValue;
                            value = (tempValue = CommonUtil.parseTimeStrToSecond(value)) == -1 ? null : String.valueOf(tempValue);
                        }
                    }
                }

                Pair<String, String> unitPair = fieldUnitMap.get(realField);
                if (aliasFieldUnit != null) {
                    if (unitPair != null) {
                        unitPair.setLeft(aliasFieldUnit);
                    } else if (field.getUnit() != null && !aliasFieldUnit.equalsIgnoreCase(field.getUnit())) {
                        unitPair = Pair.of(aliasFieldUnit, field.getUnit());
                    }
                }
                if (value != null && unitPair != null) {
                    for (UnitConvert unitConvert : unitConvertList) {
                        if (unitConvert.checkUnit(unitPair.getLeft()) && unitConvert.checkUnit(unitPair.getRight())) {
                            value = unitConvert.convert(value, unitPair.getLeft(), unitPair.getRight());
                        }
                    }
                }
                // Handle metrics values that may have units such as 34%, 34Mb, and limit values to 4 decimal places
                if (CommonConstants.TYPE_NUMBER == field.getType()) {
                    value = CommonUtil.parseDoubleStr(value, field.getUnit());
                }
                if (value == null) {
                    value = CommonConstants.NULL_VALUE;
                }
                realValueRowBuilder.addColumn(value);
            }
            aliasFieldValueMap.clear();
            fieldValueMap.clear();
            aliasFieldUnitMap.clear();
            stringTypefieldValueMap.clear();
            CollectRep.ValueRow realValueRow = realValueRowBuilder.build();
            realValueRowBuilder.clear();
            // apply filter calculation to the real value row
            if (!CollectionUtils.isEmpty(metrics.getFilters())) {
                Map<String, Object> contextMap = new HashMap<>(8);
                for (int i = 0; i < fields.size(); i++) {
                    Metrics.Field field = fields.get(i);
                    String value = realValueRow.getColumns(i);
                    contextMap.put(field.getField(), value);
                }
                boolean isMatch = false;
                for (String filterExpr : metrics.getFilters()) {
                    try {
                        JexlExpression expression = JexlExpressionRunner.compile(filterExpr);
                        if ((Boolean) JexlExpressionRunner.evaluate(expression, contextMap)) {
                            isMatch = true;
                            break;
                        }
                    } catch (Exception e) {
                        log.warn("[metrics data row filters execute warning] {}.", e.getMessage());
                    }
                }
                if (!isMatch) {
                    // ignore this data row
                    continue;
                }
            }
            collectData.addValueRow(realValueRow);
        }
    }

    /**
     * @param cal           cal
     * @param fieldAliasMap field alias map
     * @return expr
     */
    private Object[] transformCal(String cal, Map<String, String> fieldAliasMap) {
        int splitIndex = cal.indexOf("=");
        if (splitIndex < 0) {
            return null;
        }
        String field = cal.substring(0, splitIndex).trim();
        String expressionStr = cal.substring(splitIndex + 1).trim().replace("\\#", "#");
        JexlExpression expression;
        try {
            expression = JexlExpressionRunner.compile(expressionStr);
        } catch (Exception e) {
            fieldAliasMap.put(field, expressionStr);
            return null;
        }
        return new Object[]{field, expression};
    }

    /**
     * transform unit
     *
     * @param unit unit
     * @return units
     */
    private Object[] transformUnit(String unit) {
        int equalIndex = unit.indexOf("=");
        int arrowIndex = unit.indexOf("->");
        if (equalIndex < 0 || arrowIndex < 0) {
            return null;
        }
        String field = unit.substring(0, equalIndex).trim();
        String originUnit = unit.substring(equalIndex + 1, arrowIndex).trim();
        String newUnit = unit.substring(arrowIndex + 2).trim();
        return new Object[]{field, Pair.of(originUnit, newUnit)};
    }
}
