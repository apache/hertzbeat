/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

export function LogViewNotice({ display }: { display: { invalid: boolean; rejected: boolean; reset: () => void } }) {
  const { t } = useTranslation();
  if (!display.invalid && !display.rejected) return null;
  return (
    <p role="alert">
      {t(display.invalid ? 'explore.logColumns.invalidView' : 'explore.logColumns.rejectedView')}{' '}
      <Button onClick={display.reset}>{t('common.reset')}</Button>
    </p>
  );
}
