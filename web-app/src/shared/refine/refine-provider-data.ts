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

/**
 * Adapts validated application data to Refine's caller-selected response type.
 *
 * Refine chooses `TData` at each call site, so a provider cannot prove that its
 * concrete record is the exact subtype selected by the caller. Keep that one
 * unavoidable assertion here. Provider implementations must validate or build
 * their domain record before crossing this boundary.
 */
export function exposeRefineProviderData<TData>(value: unknown): TData {
  return value as TData;
}
