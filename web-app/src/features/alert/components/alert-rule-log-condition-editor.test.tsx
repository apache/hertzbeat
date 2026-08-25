/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertRuleLogConditionEditor } from './alert-rule-log-condition-editor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Alert Rule log condition editor', () => {
  afterEach(cleanup);

  it('matches the source mode row and allows empty expression authoring', () => {
    const change = vi.fn();
    const changeMode = vi.fn();
    render(
      <AlertRuleLogConditionEditor
        busy={false}
        expression=""
        mode="structured"
        change={change}
        changeMode={changeMode}
      />
    );

    expect(screen.getByRole('radiogroup', { name: 'alertRules.metricCondition.rule' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.structured' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'alertRules.metricCondition.expert' }));

    expect(changeMode).toHaveBeenCalledWith('expert', '');
  });

  it('renders the source expression mode when it is preserved across a data-type switch', () => {
    render(
      <AlertRuleLogConditionEditor busy={false} expression="" mode="expert" change={vi.fn()} changeMode={vi.fn()} />
    );

    expect(screen.getByRole('radio', { name: 'alertRules.metricCondition.expert' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'alertRules.logCondition.expression' })).toHaveAttribute('rows', '3');
    expect(screen.getByRole('textbox', { name: 'alertRules.logCondition.expression' })).toHaveAttribute(
      'maxlength',
      '200'
    );
  });

  it('offers the complete source field and operator insertion catalog', async () => {
    render(
      <AlertRuleLogConditionEditor busy={false} expression="" mode="expert" change={vi.fn()} changeMode={vi.fn()} />
    );
    const insert = screen.getByRole('button', { name: 'alertRules.metricCondition.insertExpression' });
    fireEvent.mouseDown(insert);
    fireEvent.click(insert);

    await waitFor(() => expect(screen.getByText('Time (Unix Nano)')).toBeInTheDocument());
    expect(screen.getByText('Instrumentation Scope Dropped Attributes Count')).toBeInTheDocument();
    expect(screen.getByText('alertRules.metricCondition.operators.()')).toBeInTheDocument();
  });

  it('round-trips a source object attribute through the separate attribute input', () => {
    const change = vi.fn();
    render(
      <AlertRuleLogConditionEditor
        busy={false}
        expression={'equals(log.attributes.http.method, "GET")'}
        mode="structured"
        change={change}
        changeMode={vi.fn()}
      />
    );

    const attribute = screen.getByRole('textbox', { name: 'alertRules.metricCondition.objectAttribute' });
    expect(attribute).toHaveValue('http.method');
    fireEvent.change(attribute, { target: { value: 'service.name' } });

    expect(change).toHaveBeenCalledWith('equals(log.attributes.service.name, "GET")');

    change.mockClear();
    fireEvent.change(attribute, { target: { value: 'service-name' } });
    expect(change).not.toHaveBeenCalled();
  });
});
