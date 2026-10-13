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

import { DEFAULT_LOG_ANALYSIS, validLogAnalysis } from '@/platform/perses';

import type { useExplorePageController } from '../controller/use-explore-page-controller';
import { readLogAnalysisDraft } from '../model/explore-log-analysis';

type Controller = ReturnType<typeof useExplorePageController>;

export function hasLogResultHeader(controller: Controller) {
  const { result } = controller;
  if (!rendersHistoricalChildren(controller)) return false;
  const evidence = result.kind === 'refreshing' || result.kind === 'stale_error' ? result.evidence : result;
  return (evidence.kind === 'ready' || evidence.kind === 'empty') && evidence.signal === 'logs';
}

function rendersHistoricalChildren(controller: Controller) {
  const { query } = controller;
  if (query.signal !== 'logs' || query.live) return false;
  if (query.logRecordUid) return true;
  if (controller.transactions?.active) return false;
  if (groupingReplacesHistory(controller)) return false;
  if (!validLogAnalysis(query.logAnalysis)) return false;
  return !analysisReplacesHistory(controller);
}

function analysisReplacesHistory(controller: Controller) {
  const { query, result } = controller;
  if (query.signal !== 'logs') return false;
  const analysis = query.logAnalysis ? readLogAnalysisDraft(query.logAnalysis) : DEFAULT_LOG_ANALYSIS;
  return Boolean(
    analysis &&
    analysis.representation !== 'logs' &&
    controller.handoff !== 'invalid' &&
    ['ready', 'empty', 'refreshing'].includes(result.kind)
  );
}

function groupingReplacesHistory(controller: Controller) {
  const { query, result } = controller;
  if (query.signal !== 'logs') return false;
  return (
    (query.logAggregation === 'patterns' || query.logAggregation === 'calculated') &&
    (result.kind === 'ready' || result.kind === 'empty') &&
    result.signal === 'logs'
  );
}
