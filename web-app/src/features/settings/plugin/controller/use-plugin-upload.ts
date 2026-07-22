/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { PluginRequestError, uploadPlugin } from '../api/plugin-api';
import {
  buildEmptyPluginUpload,
  validatePluginUpload,
  type PluginFailureKind,
  type PluginUploadDraft
} from '../model/plugin-model';

export function usePluginUpload(canWrite: boolean, onChanged: () => Promise<void>) {
  const [upload, setUpload] = useState<PluginUploadDraft | null>(null);
  const [uploadInvalid, setInvalid] = useState({ name: false, jarFile: false });
  const [failure, setFailure] = useState<PluginFailureKind | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const open = () => {
    if (!canWrite || active.current) return;
    setFailure(null);
    setInvalid({ name: false, jarFile: false });
    setUpload(buildEmptyPluginUpload());
  };
  const cancel = () => {
    if (active.current) return;
    setUpload(null);
    setInvalid({ name: false, jarFile: false });
  };
  const patch = (value: Partial<PluginUploadDraft>) => {
    if (!active.current) setUpload(current => (current ? { ...current, ...value } : current));
  };
  const save = async () => {
    if (!canWrite || !upload || active.current) return;
    const valid = validatePluginUpload(upload);
    setInvalid({ name: !valid.name, jarFile: !valid.jarFile });
    if (!valid.name || !valid.jarFile) return;
    active.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await uploadPlugin(upload);
      setUpload(null);
      await onChanged();
    } catch (error) {
      setFailure(error instanceof PluginRequestError ? error.kind : 'error');
    } finally {
      active.current = false;
      setBusy(false);
    }
  };
  return {
    upload,
    uploadInvalid,
    failure,
    busy,
    actions: {
      openUpload: open,
      cancelUpload: cancel,
      saveUpload: save,
      setUploadName: (name: string) => patch({ name }),
      setUploadFile: (jarFile: File | null) => patch({ jarFile }),
      setUploadEnabled: (enableStatus: boolean) => patch({ enableStatus })
    }
  };
}
