/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useEffect, useRef, useState } from 'react';
import { Checkbox, Input, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { readDashboardImportFile } from '../model/signal-dashboard-import';

export function SignalDashboardImport({
  open,
  close,
  submit
}: {
  open: boolean;
  close: () => void;
  submit: (text: string, asCopy: boolean) => boolean;
}) {
  const { t } = useTranslation();
  const [copy, setCopy] = useState(false);
  const { text, error, setError, edit, readFile, retire } = useImportText(open);
  return (
    <Modal
      open={open}
      title={t('signalDashboard.import')}
      onCancel={() => {
        retire();
        close();
      }}
      onOk={() => setError(!submit(text, copy))}
      okButtonProps={{ disabled: !text || error }}
    >
      <Typography.Paragraph>{t('signalDashboard.importHelp')}</Typography.Paragraph>
      <input
        type="file"
        accept="application/json,.json"
        aria-label={t('signalDashboard.importFile')}
        onChange={event => {
          void readFile(event.target.files?.[0]);
        }}
      />
      <Input.TextArea
        aria-label={t('signalDashboard.documentJson')}
        value={text}
        rows={10}
        onChange={event => {
          edit(event.target.value);
        }}
      />
      <Checkbox checked={copy} onChange={event => setCopy(event.target.checked)}>
        {t('signalDashboard.importCopy')}
      </Checkbox>
      {error && (
        <Typography.Paragraph type="danger" role="alert">
          {t('signalDashboard.invalidDocument')}
        </Typography.Paragraph>
      )}
    </Modal>
  );
}

function useImportText(open: boolean) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const retire = () => {
    generation.current += 1;
  };
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, [open]);
  const edit = (value: string) => {
    retire();
    setText(value);
    setError(false);
  };
  const readFile = async (file: File | undefined) => {
    retire();
    if (!file) return;
    const current = generation.current;
    setText('');
    setError(false);
    try {
      const value = await readDashboardImportFile(file);
      if (generation.current === current) setText(value);
    } catch {
      if (generation.current === current) setError(true);
    }
  };
  return { text, error, setError, edit, readFile, retire };
}
