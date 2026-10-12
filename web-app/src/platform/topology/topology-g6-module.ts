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

import { Circle, Ellipse, Group, HTML, Line as ShapeLine, Path, Polygon, Polyline, Rect, Text } from '@antv/g';
import {
  ComboCollapse,
  ComboExpand,
  Fade,
  NodeCollapse,
  NodeExpand,
  PathIn,
  PathOut,
  Translate
} from '@antv/g6/esm/animations';
import { DragCanvas, ZoomCanvas } from '@antv/g6/esm/behaviors';
import { Circle as CircleNode, CircleCombo, Hexagon, Line, RectCombo } from '@antv/g6/esm/elements';
import { Badge, Image, Label } from '@antv/g6/esm/elements/shapes';
import { D3ForceLayout } from '@antv/g6/esm/layouts';
import { blues, greens, oranges, spectral, tableau } from '@antv/g6/esm/palettes';
import { register } from '@antv/g6/esm/registry/register';
import { dark, light } from '@antv/g6/esm/themes';
import {
  ArrangeDrawOrder,
  CollapseExpandCombo,
  CollapseExpandNode,
  GetEdgeActualEnds,
  UpdateRelatedEdge
} from '@antv/g6/esm/transforms';

// G6's root preset registers every plugin and layout. This adapter retains the
// extensions used by topology plus the graph's required transforms and defaults.
register('node', 'circle', CircleNode);
register('node', 'hexagon', Hexagon);
register('edge', 'line', Line);
register('combo', 'circle', CircleCombo);
register('combo', 'rect', RectCombo);
register('layout', 'd3-force', D3ForceLayout);
register('behavior', 'drag-canvas', DragCanvas);
register('behavior', 'zoom-canvas', ZoomCanvas);
register('theme', 'light', light);
register('theme', 'dark', dark);
register('palette', 'blues', blues);
register('palette', 'greens', greens);
register('palette', 'oranges', oranges);
register('palette', 'spectral', spectral);
register('palette', 'tableau', tableau);
register('transform', 'update-related-edges', UpdateRelatedEdge);
register('transform', 'collapse-expand-node', CollapseExpandNode);
register('transform', 'collapse-expand-combo', CollapseExpandCombo);
register('transform', 'get-edge-actual-ends', GetEdgeActualEnds);
register('transform', 'arrange-draw-order', ArrangeDrawOrder);
registerShapes();
registerAnimations();

function registerShapes() {
  register('shape', 'circle', Circle);
  register('shape', 'ellipse', Ellipse);
  register('shape', 'group', Group);
  register('shape', 'html', HTML);
  register('shape', 'image', Image);
  register('shape', 'line', ShapeLine);
  register('shape', 'path', Path);
  register('shape', 'polygon', Polygon);
  register('shape', 'polyline', Polyline);
  register('shape', 'rect', Rect);
  register('shape', 'text', Text);
  register('shape', 'label', Label);
  register('shape', 'badge', Badge);
}

function registerAnimations() {
  register('animation', 'combo-collapse', ComboCollapse);
  register('animation', 'combo-expand', ComboExpand);
  register('animation', 'node-collapse', NodeCollapse);
  register('animation', 'node-expand', NodeExpand);
  register('animation', 'path-in', PathIn);
  register('animation', 'path-out', PathOut);
  register('animation', 'fade', Fade);
  register('animation', 'translate', Translate);
}

export { Graph } from '@antv/g6/esm/runtime/graph';
export { NodeEvent, EdgeEvent, CanvasEvent, GraphEvent } from '@antv/g6/esm/constants';
