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

import { describe, expect, it } from 'vitest';

import { alertRuleLogTableColumns, getAlertRuleSqlCompletions, validateAlertRuleSql } from './alert-rule-sql';

describe('Alert rule SQL contract', () => {
  it('exposes the complete 1.8.0 HertzBeat log-table catalog', () => {
    expect(alertRuleLogTableColumns.map(column => column.name)).toEqual([
      'time_unix_nano',
      'observed_time_unix_nano',
      'severity_number',
      'severity_text',
      'body',
      'trace_id',
      'span_id',
      'trace_flags',
      'attributes',
      'resource',
      'instrumentation_scope',
      'dropped_attributes_count'
    ]);
  });

  it('mirrors the 1.8.0 SQL safety feedback without replacing backend authority', () => {
    expect(validateAlertRuleSql('SELECT count(*) FROM hertzbeat_logs')).toEqual([]);
    expect(validateAlertRuleSql('DELETE FROM hertzbeat_logs')).toContain('selectOnly');
    expect(validateAlertRuleSql('SELECT * FROM other_logs')).toContain('table');
    expect(validateAlertRuleSql('SELECT 1')).toContain('from');
    expect(validateAlertRuleSql('WITH rows AS (SELECT * FROM hertzbeat_logs) SELECT * FROM rows')).toContain(
      'selectOnly'
    );
    expect(validateAlertRuleSql('SELECT * FROM hertzbeat_logs UNION SELECT * FROM hertzbeat_logs')).toContain('union');
    expect(validateAlertRuleSql('SELECT * FROM hertzbeat_logs WHERE id IN (SELECT id FROM hertzbeat_logs)')).toContain(
      'subquery'
    );
    expect(validateAlertRuleSql('SELECT count((*) FROM hertzbeat_logs')).toContain('parentheses');
  });

  it('mirrors the 1.8.0 context-sensitive completion catalog', () => {
    expect(getAlertRuleSqlCompletions('').map(item => item.label)).toEqual([
      'SELECT * FROM hertzbeat_logs',
      'SELECT COUNT(*) FROM hertzbeat_logs',
      'SELECT'
    ]);
    expect(getAlertRuleSqlCompletions('SELECT * FROM hertz').map(item => item.label)).toEqual(['hertzbeat_logs']);
    expect(getAlertRuleSqlCompletions('SELECT ').map(item => item.label)).toEqual([
      '*',
      ...alertRuleLogTableColumns.map(column => column.name)
    ]);
    expect(getAlertRuleSqlCompletions('SELECT * FROM hertzbeat_logs WHERE ').map(item => item.label)).toEqual([
      ...alertRuleLogTableColumns.map(column => column.name),
      'AND',
      'OR',
      'NOT',
      'IN',
      'LIKE',
      'BETWEEN',
      'IS NULL',
      'IS NOT NULL',
      'ORDER BY',
      'LIMIT',
      'GROUP BY'
    ]);
  });
});
