/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import enUS from 'antd/es/locale/en_US';
import jaJP from 'antd/es/locale/ja_JP';
import ptBR from 'antd/es/locale/pt_BR';
import zhCN from 'antd/es/locale/zh_CN';
import zhTW from 'antd/es/locale/zh_TW';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';

import { isSupportedLocale } from './locale';

const locales = { 'en-US': enUS, 'ja-JP': jaJP, 'pt-BR': ptBR, 'zh-CN': zhCN, 'zh-TW': zhTW } as const;

export function resolveAntLocale(language?: string) {
  return isSupportedLocale(language) ? locales[language] : enUS;
}

export function syncDayjsLocale(language?: string) {
  dayjs.locale(resolveAntLocale(language).locale);
}
