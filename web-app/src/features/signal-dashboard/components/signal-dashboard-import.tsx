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
