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

import { AutoplayOptions } from 'swiper/types';

import { createCategoryCarouselOptions } from './dashboard.component';

describe('createCategoryCarouselOptions', () => {
  it('disables autoplay and rewind when all category cards fit', () => {
    const options = createCategoryCarouselOptions(4);

    expect(options.autoplay).toBeFalse();
    expect(options.rewind).toBeFalse();
  });

  it('enables wrap-around autoplay when category cards overflow', () => {
    const options = createCategoryCarouselOptions(5);
    const autoplay = options.autoplay as AutoplayOptions;

    expect(autoplay.delay).toBe(2400);
    expect(autoplay.disableOnInteraction).toBeFalse();
    expect(options.rewind).toBeTrue();
  });

  it('keeps the existing responsive card counts', () => {
    const options = createCategoryCarouselOptions(5);

    expect(options.slidesPerView).toBe(0.75);
    expect(options.breakpoints?.[480].slidesPerView).toBe(2.75);
    expect(options.breakpoints?.[1024].slidesPerView).toBe(4);
  });
});
