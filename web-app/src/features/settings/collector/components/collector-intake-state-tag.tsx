/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import { collectorIntakeState, type CollectorInstrumentationIntake } from '@/shared/collector';

export function CollectorIntakeStateTag({ intake }: { intake: CollectorInstrumentationIntake }) {
  const { t } = useTranslation();
  const state = collectorIntakeState(intake);
  return <Tag color={intakeStateColor(state)}>{t(`collectors.intake.state.${state}`)}</Tag>;
}

function intakeStateColor(state: ReturnType<typeof collectorIntakeState>) {
  if (state === 'available') return 'success';
  if (state === 'notAdvertised') return 'default';
  return state === 'invalid' ? 'error' : 'warning';
}
