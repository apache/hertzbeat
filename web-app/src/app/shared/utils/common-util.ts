/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Tag } from '../../pojo/Tag';

export function formatTagName(tag: Tag): string {
  if (tag.tagValue != undefined && tag.tagValue.trim() != '') {
    return `${tag.name}:${tag.tagValue}`;
  } else {
    return tag.name;
  }
}

export function findDeepestSelected(nodes: any): any {
  let deepestSelectedNode = null;
  for (let node of nodes) {
    if (node._selected && (!node.children || node.children.length === 0)) {
      return node;
    }

    if (node.children) {
      const selectedChild = findDeepestSelected(node.children);
      if (selectedChild) {
        deepestSelectedNode = selectedChild;
      }
    }
  }
  return deepestSelectedNode;
}
