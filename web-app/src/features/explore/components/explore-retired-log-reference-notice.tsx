/* Licensed to the Apache Software Foundation (ASF) under one or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership. The ASF licenses this file to You under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License
 * at http://www.apache.org/licenses/LICENSE-2.0 . Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under the License.
 */
import { Button } from 'antd';
import type { TFunction } from 'i18next';

import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';

export function ExploreRetiredLogReferenceNotice({
  submission,
  t
}: {
  submission: ExploreSubmissionViewModel;
  t: TFunction;
}) {
  if (submission.draft.signal !== 'logs' || submission.draft.logReferenceJoin === undefined) return null;
  return (
    <p role="alert">
      {t('explore.retiredReferenceJoin')}{' '}
      <Button type="link" onClick={() => submission.updateField({ field: 'logReferenceJoin', value: undefined })}>
        {t('common.delete')}
      </Button>
    </p>
  );
}
