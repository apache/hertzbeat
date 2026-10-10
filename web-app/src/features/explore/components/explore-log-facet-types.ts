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

import type { LogFacetFieldsResult, LogFacetValuesResult } from '../model/explore-log-facets';
import type { FacetRead } from './explore-log-facet-state';
import type { ReactNode } from 'react';

import type { FacetValueAction } from '../model/explore-log-facet-action';
export type { FacetValueAction } from '../model/explore-log-facet-action';

export type ExploreLogFacetsProps = {
  fields: FacetRead<LogFacetFieldsResult>;
  onCatalogRetry: () => void;
  renderValues: (fieldId: string, fieldLabel: string) => ReactNode;
  extraFields?: Array<{ id: string; label: string }> | undefined;
};

export type FacetValuesProps = {
  fieldId: string;
  fieldLabel: string;
  values: FacetRead<LogFacetValuesResult>;
  valueSearch: string;
  onValueSearchChange: (value: string) => void;
  onRetry: () => void;
  actionForValue: FacetValueAction;
};
