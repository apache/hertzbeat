/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type NoticeReceiverFailureKind = 'missing' | 'invalid' | 'unavailable' | 'error';
export type NoticeReceiverNonMissingFailureKind = Exclude<NoticeReceiverFailureKind, 'missing'>;
