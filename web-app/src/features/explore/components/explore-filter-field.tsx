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

import type { TFunction } from "i18next";
import type { ReactNode } from "react";

import type { ExploreSubmissionErrors } from "../hooks/use-explore-submission";
import styles from "./explore-query-bar.module.css";

export function ExploreFilterField({ id, error, t, children }: {
  id: string;
  error: ExploreSubmissionErrors[keyof ExploreSubmissionErrors];
  t: TFunction;
  children: ReactNode;
}) {
  return <div className={styles.field}>
    {children}
    {error && <span id={`${id}-error`} className={styles.fieldError} role="alert">{t(submissionErrorKey(error))}</span>}
  </div>;
}

function submissionErrorKey(error: NonNullable<ExploreSubmissionErrors[keyof ExploreSubmissionErrors]>) {
  if (error === "unsupported_aggregation") return "explore.submissionErrors.unsupportedAggregation";
  if (error === "invalid_step") return "explore.submissionErrors.invalidStep";
  if (error === "min_exceeds_max") return "explore.submissionErrors.minExceedsMax";
  return "explore.submissionErrors.invalidDuration";
}
