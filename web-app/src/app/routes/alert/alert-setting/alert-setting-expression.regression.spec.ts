/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { NEVER, Subject } from 'rxjs';

import { AlertSettingComponent } from './alert-setting.component';

describe('Alert setting expression preservation regression', () => {
  let component: AlertSettingComponent;
  let detail: Subject<any>;
  let save: jasmine.Spy;

  beforeEach(() => {
    detail = new Subject<any>();
    save = jasmine.createSpy('editAlertDefine').and.returnValue(NEVER);
    component = new AlertSettingComponent(
      jasmine.createSpyObj('modal', ['create']),
      jasmine.createSpyObj('notifications', ['success', 'error']),
      jasmine.createSpyObj('apps', ['getAppHierarchy']),
      jasmine.createSpyObj('monitors', ['getMonitorsByApp']),
      { getAlertDefine: () => detail, editAlertDefine: save } as any,
      { fanyi: (key: string) => key } as any,
      new FormBuilder(),
      jasmine.createSpyObj('messages', ['success'])
    );
    component.appHierarchies = [];
  });

  function open(type: string, expr: string) {
    component.editAlertDefine(7);
    detail.next({ code: 0, data: { id: 7, name: 'preserve rule', type, expr } });
    detail.complete();
  }

  for (const type of ['realtime_log', 'realtime_metric']) {
    const field = type === 'realtime_log' ? 'log.severityNumber' : 'usage';
    const prefix = type === 'realtime_metric' ? 'equals(__app__,"linux") && equals(__metrics__,"cpu") && ' : '';
    for (const threshold of [
      `${field} > 5 and ${field} < (1 + 2)`,
      `${field} < (1 + 2) or ${field} > 5`,
      `(${field} > 5 and (${field} < 8 or ${field} < (1 + 2)))`,
      `${field} > (1 + 2)`,
      `${field} > 5 and ${field} === 10`
    ]) {
      it(`preserves unsupported ${type} source: ${threshold}`, fakeAsync(() => {
        const expr = `${prefix}${threshold}`;
        open(type, expr);
        tick();

        expect(component.isExpr).toBeTrue();
        expect(component.define.expr).toBe(expr);
        expect(component.userExpr.trim()).toBe(threshold.trim());
      }));
    }

    it(`preserves exact ${type} source when visual conversion is requested again`, fakeAsync(() => {
      const threshold = `  ${field} > 5 and ${field} < (1 + 2)  `;
      const expr = `${prefix}${threshold}`;
      open(type, expr);
      tick();
      component.isExpr = false;
      component.switchAlertRuleShow();

      expect(component.isExpr).toBeTrue();
      expect(component.define.expr).toBe(expr);
      expect(component.userExpr.trim()).toBe(threshold.trim());
    }));

    it(`keeps complete nested ${type} conditions available in visual mode`, fakeAsync(() => {
      open(type, `${prefix}${field} > 5 and (${field} < 8 or ${field} == 10)`);
      tick();

      expect(component.isExpr).toBeFalse();
      expect(component.define.expr).toContain(`${field} > 5`);
      expect(component.define.expr).toContain(`(${field} < 8 or ${field} == 10)`);
      expect(component.qbFormCtrl.valid).toBeTrue();
    }));
  }

  it('retains quoted logical words and parentheses without dropping another operand', () => {
    const expr = 'equals(log.body, "a and (b)") and log.severityNumber > (1 + 2)';
    open('realtime_log', expr);

    expect(component.isExpr).toBeTrue();
    expect(component.define.expr).toBe(expr);
  });

  it('keeps a complete quoted string condition available in visual mode', () => {
    open('realtime_log', 'equals(log.body, "a and (b)") and log.severityNumber > 5');

    expect(component.isExpr).toBeFalse();
    expect(component.define.expr).toContain('equals(log.body, "a and (b)")');
    expect(component.define.expr).toContain('log.severityNumber > 5');
  });

  it('uses AND before OR for unparenthesized conditions', () => {
    open('realtime_log', 'log.severityNumber >5 and log.severityNumber <8 or log.severityNumber ==2');

    expect(component.isExpr).toBeFalse();
    expect(component.define.expr).toBe('(log.severityNumber > 5 and log.severityNumber < 8) or log.severityNumber == 2');
    // Severity 2 satisfies the final OR condition even though it fails the first AND operand.
    expect(component.qbData.condition).toBe('or');
    expect(component.qbData.rules.length).toBe(2);
  });

  it('preserves the reviewed mixed-operator rule grouping', () => {
    open('realtime_log', 'log.severityNumber >5 and log.severityNumber <8 or log.severityNumber ==10');

    expect(component.isExpr).toBeFalse();
    expect(component.define.expr).toBe('(log.severityNumber > 5 and log.severityNumber < 8) or log.severityNumber == 10');
  });

  it('retains explicit parentheses overriding AND precedence', () => {
    open('realtime_log', 'log.severityNumber >5 and (log.severityNumber <8 or log.severityNumber ==2)');

    expect(component.isExpr).toBeFalse();
    expect(component.define.expr).toBe('log.severityNumber > 5 and (log.severityNumber < 8 or log.severityNumber == 2)');
  });

  it('ignores closing parentheses and logical words inside a quoted value', () => {
    open('realtime_log', 'equals(log.body, "left ) or right") and log.severityNumber >5 or log.severityNumber ==2');

    expect(component.isExpr).toBeFalse();
    expect(component.define.expr).toBe('(equals(log.body, "left ) or right") and log.severityNumber > 5) or log.severityNumber == 2');
  });

  it('keeps unsupported mixed-operator source exactly in expert mode', () => {
    const expr = 'log.severityNumber >5 and log.severityNumber <8 or log.severityNumber < (1 + 2)';
    open('realtime_log', expr);

    expect(component.isExpr).toBeTrue();
    expect(component.define.expr).toBe(expr);
  });

  for (const type of ['realtime_log', 'realtime_metric']) {
    const field = type === 'realtime_log' ? 'log.severityNumber' : 'usage';
    const prefix = type === 'realtime_metric' ? 'equals(__app__,"linux") && equals(__metrics__,"cpu") && ' : '';
    for (const literal of [
      '9007199254740993',
      '-9007199254740993',
      '0.10000000000000001',
      '-0.10000000000000001',
      '123456789012345.6789',
      `0.${'0'.repeat(323)}1`,
      `1${'0'.repeat(309)}`
    ]) {
      it(`keeps lossy ${type} numeric literal ${literal} in exact expert source and permits saving it`, fakeAsync(() => {
        const expr = `${prefix}${field} == ${literal}`;
        open(type, expr);
        tick();

        expect(component.isExpr).toBeTrue();
        expect(component.define.expr).toBe(expr);
        component.onManageModalOk();
        expect(save).toHaveBeenCalledOnceWith(component.define);
        expect(save.calls.mostRecent().args[0].expr).toBe(expr);
      }));
    }

    for (const [literal, rendered] of [
      ['9007199254740991', '9007199254740991'],
      ['9007199254740992', '9007199254740992'],
      ['-9007199254740992', '-9007199254740992'],
      ['9007199254740994', '9007199254740994'],
      ['0.1', '0.1'],
      ['00012.3400', '12.34'],
      ['-00012.3400', '-12.34'],
      ['0.0000001', '1e-7'],
      [`1${'0'.repeat(21)}`, '1e+21'],
      ['-000.000', '0']
    ]) {
      it(`keeps round-trip-safe ${type} numeric literal ${literal} available visually`, fakeAsync(() => {
        open(type, `${prefix}${field} == ${literal}`);
        tick();

        expect(component.isExpr).toBeFalse();
        expect(component.define.expr).toBe(`${prefix}${field} == ${rendered}`);
        expect(component.qbFormCtrl.valid).toBeTrue();
      }));
    }

    for (const literal of ['1e3', '1e-324', '-9.007199254740993e15']) {
      it(`retains unsupported scientific ${type} literal ${literal} as exact expert source`, fakeAsync(() => {
        const expr = `${prefix}${field} == ${literal}`;
        open(type, expr);
        tick();

        expect(component.isExpr).toBeTrue();
        expect(component.define.expr).toBe(expr);
      }));
    }

    it(`does not publish a partial visual ${type} tree when one numeric operand loses precision`, fakeAsync(() => {
      const expr = `${prefix}${field} > 5 and ${field} == 9007199254740993`;
      open(type, expr);
      tick();

      expect(component.isExpr).toBeTrue();
      expect(component.define.expr).toBe(expr);
    }));
  }
});
