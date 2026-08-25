/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

describe('Alert Rule locale coverage', () => {
  it('uses the exact stable Latin 1.8.0 target-derived row-count labels', () => {
    expect(en.alertRules.metricTarget.rowCount).toBe('Value rows');
    expect(pt.alertRules.metricTarget.rowCount).toBe('Contagem de linhas de valor do Sistema-Métricas');
  });

  it('uses the Apache master rule-editor terminology in the stable English fixture', () => {
    expect(en.alertRules.newRealtime).toBe('New RealTime Threshold');
    expect(en.alertRules.newPeriodic).toBe('New Periodic Threshold');
    expect(en.alertRules.editRealtime).toBe('Edit RealTime Threshold');
    expect(en.alertRules.editPeriodic).toBe('Edit Periodic Threshold');
    expect(en.alertRules.template).toBe('Alarm Content');
    expect(en.alertRules.enabledThreshold).toBe('Enable Threshold');
    expect(en.alertRules.period).toBe('Execution Period');
  });

  it('provides batch-delete copy in every runtime locale', () => {
    for (const locale of [en, ja, pt, zhCn, zhTw]) {
      expect(locale.common.confirm).toBeTruthy();
      expect(locale.alertRules.deleteSelected).toBeTruthy();
      expect(locale.alertRules.deleteSelectedConfirm).toContain('{{count}}');
      expect(locale.alertRules.export.selected).toBeTruthy();
      expect(locale.alertRules.export.format.json).toBeTruthy();
      expect(locale.alertRules.export.format.excel).toBeTruthy();
      expect(locale.alertRules.export.format.yaml).toBeTruthy();
      expect(locale.alertRules.export.failure.unavailable).toBeTruthy();
      expect(locale.alertRules.import.open).toBeTruthy();
      expect(locale.alertRules.import.validation.unsupported).toBeTruthy();
      expect(locale.alertRules.import.failure.uncertain).toBeTruthy();
      expect(locale.alertRules.import.inspect).toBeTruthy();
      expect(locale.alertRules.datasource.checking).toBeTruthy();
      expect(locale.alertRules.datasource.none).toBeTruthy();
      expect(locale.alertRules.datasource.promqlOnly).toBeTruthy();
      expect(locale.alertRules.datasource.sqlOnly).toBeTruthy();
      expect(locale.alertRules.previewTruncated).toBeTruthy();
      expect(locale.alertRules.previewInvalid).toBeTruthy();
      expect(locale.alertRules.previewInputInvalid).toBeTruthy();
      expect(locale.alertRules.required).toBeTruthy();
      expect(locale.alertRules.guide.alertCenter).toBeTruthy();
      expect(locale.alertRules.guide.deliveryRules).toBeTruthy();
      expect(locale.alertRules.typeChoice.realtimeDescription).toBeTruthy();
      expect(locale.alertRules.typeChoice.periodicDescription).toBeTruthy();
      expect(locale.alertRules.newRealtime).toBeTruthy();
      expect(locale.alertRules.newPeriodic).toBeTruthy();
      expect(locale.alertRules.editRealtime).toBeTruthy();
      expect(locale.alertRules.editPeriodic).toBeTruthy();
      expect(locale.alertRules.enabledThreshold).toBeTruthy();
      expect(locale.alertRules.help.name).toBeTruthy();
      expect(locale.alertRules.help.dataType).toBeTruthy();
      expect(locale.alertRules.help.target).toBeTruthy();
      expect(locale.alertRules.help.rule).toBeTruthy();
      expect(locale.alertRules.help.bindings).toBeTruthy();
      expect(locale.alertRules.help.period).toBeTruthy();
      expect(locale.alertRules.help.window).toBeTruthy();
      expect(locale.alertRules.help.severity).toBeTruthy();
      expect(locale.alertRules.help.mode).toBeTruthy();
      expect(locale.alertRules.help.times).toBeTruthy();
      expect(locale.alertRules.help.template).toBeTruthy();
      expect(locale.alertRules.help.labels).toBeTruthy();
      expect(locale.alertRules.help.annotations).toBeTruthy();
      expect(locale.alertRules.help.enable).toBeTruthy();
      expect(locale.alertRules.help.queryMetric).toBeTruthy();
      expect(locale.alertRules.help.queryLog).toBeTruthy();
      expect(locale.alertRules.templatePlaceholder).toBeTruthy();
      expect(locale.alertRules.periodPlaceholder).toBeTruthy();
      expect(locale.alertRules.windowPlaceholder).toBeTruthy();
      expect(locale.alertRules.confirm).toBeTruthy();
      expect(locale.alertRules.query.promqlDescription).toBeTruthy();
      expect(locale.alertRules.query.promqlUnsupportedLog).toBeTruthy();
      expect(locale.alertRules.query.promqlPlaceholder).toBeTruthy();
      expect(locale.alertRules.query.sqlDescription).toBeTruthy();
      expect(locale.alertRules.query.sqlUnsupportedMetric).toBeTruthy();
      expect(locale.alertRules.query.sqlValidation.selectOnly).toBeTruthy();
      expect(locale.alertRules.query.sqlValidation.table).toBeTruthy();
      expect(locale.alertRules.query.examples).toBeTruthy();
      expect(locale.alertRules.severity.label).toBeTruthy();
      expect(locale.alertRules.severity.placeholder).toBeTruthy();
      expect(locale.alertRules.mode.group).toBeTruthy();
      expect(locale.alertRules.mode.individual).toBeTruthy();
      expect(locale.alertRules.mode.placeholder).toBeTruthy();
      expect(locale.alertRules.metricTarget.availabilityDown).toBeTruthy();
      expect(locale.alertRules.metricTarget.availabilityUnreachable).toBeTruthy();
      expect(locale.alertRules.metricTarget.availabilityTrigger).toBeTruthy();
      expect(locale.alertRules.metricTarget.rowCount).toBeTruthy();
      expect(locale.alertRules.metricCondition.rule).toBeTruthy();
      expect(locale.alertRules.metricCondition.ruleButton).toBeTruthy();
      expect(locale.alertRules.metricCondition.rulesetButton).toBeTruthy();
      expect(locale.alertRules.metricCondition.emptyGroup).toBeTruthy();
      expect(locale.alertRules.metricCondition.numberPlaceholder).toBeTruthy();
      expect(locale.alertRules.metricCondition.stringPlaceholder).toBeTruthy();
      expect(locale.alertRules.metricCondition.objectAttribute).toBeTruthy();
      expect(locale.alertRules.metricCondition.objectAttributePlaceholder).toBeTruthy();
      expect(locale.alertRules.metricCondition.expressionTypes.time).toBeTruthy();
      expect(locale.alertRules.metricCondition.expressionTypes.object).toBeTruthy();
      expect(locale.alertRules.logCondition.expression).toBeTruthy();
      expect(locale.alertRules.logCondition.expressionPlaceholder).toBeTruthy();
      expect(locale.alertRules.finalExpression).toBeTruthy();
      expect(locale.alertRules.annotations).toBeTruthy();
      expect(locale.alertRules.map.addLabel).toBeTruthy();
      expect(locale.alertRules.map.addAnnotation).toBeTruthy();
      expect(locale.alertRules.variables.__instance__).toBeTruthy();
      expect(locale.alertRules.variables.log.body).toBeTruthy();
      expect(locale.alertRules.metricBindings.title).toBeTruthy();
      expect(locale.alertRules.metricBindings.description).toBeTruthy();
      expect(locale.alertRules.metricBindings.manage).toBeTruthy();
      expect(locale.alertRules.metricBindings.loading).toBeTruthy();
      expect(locale.alertRules.metricBindings.empty).toBeTruthy();
      expect(locale.alertRules.metricBindings.instances).toBeTruthy();
      expect(locale.alertRules.metricBindings.labels).toBeTruthy();
      expect(locale.alertRules.metricBindings.dialogTitle).toBeTruthy();
      expect(locale.alertRules.metricBindings.unassociated).toBeTruthy();
      expect(locale.alertRules.metricBindings.associated).toBeTruthy();
      expect(locale.alertRules.metricBindings.count).toContain('{{count}}');
      expect(locale.alertRules.metricBindings.filterName).toBeTruthy();
      expect(locale.alertRules.metricBindings.filterLabels).toBeTruthy();
      expect(locale.alertRules.metricBindings.moveLeft).toBeTruthy();
      expect(locale.alertRules.metricBindings.moveRight).toBeTruthy();
      expect(locale.alertRules.metricBindings.selectAll.unassociated).toBeTruthy();
      expect(locale.alertRules.metricBindings.selectAll.associated).toBeTruthy();
      expect(locale.alertRules.metricBindings.noData).toBeTruthy();
      expect(locale.alertRules.metricBindings.addLabel).toBeTruthy();
      expect(locale.alertRules.metricBindings.removeLabel).toBeTruthy();
      expect(locale.alertRules.metricBindings.labelEmpty).toBeTruthy();
      expect(locale.alertRules.metricBindings.noLabels).toBeTruthy();
      expect(locale.alertRules.metricBindings.unavailable).toBeTruthy();
      expect(locale.alertRules.metricBindings.contractError).toBeTruthy();
      expect(locale.alertRules.metricBindings.error).toBeTruthy();
    }
  });
});
