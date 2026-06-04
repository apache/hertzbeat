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

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children' | 'type' | 'value'> {}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(({ className, ...props }, ref) => (
  <input
    {...props}
    ref={ref}
    type="file"
    data-hz-file-input-owner="hertzbeat-ui-file-input"
    data-hz-file-input-control="native-hidden-file"
    className={cn('hidden', className)}
  />
));

FileInput.displayName = 'FileInput';

export { FileInput };
