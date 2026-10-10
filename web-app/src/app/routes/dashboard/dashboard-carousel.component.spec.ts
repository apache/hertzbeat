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

import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { configureShallowTest } from '@testing';
import { Subject } from 'rxjs';
import { register, SwiperContainer } from 'swiper/element/bundle';
import { SwiperOptions } from 'swiper/types';

import { AppCount } from '../../pojo/AppCount';
import { MonitorService } from '../../service/monitor.service';
import { createCategoryCarouselOptions, DashboardComponent } from './dashboard.component';

describe('Dashboard real Swiper carousel', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let monitorSvc: jasmine.SpyObj<MonitorService>;

  const afterLayout = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  function renderCards(count: number, options: SwiperOptions = createCategoryCarouselOptions(count)): SwiperContainer {
    component.categoryCards = Array.from({ length: count }, (_, index) => ({
      category: `category-${index}`,
      icon: 'cloud',
      count: Object.assign(new AppCount(), { size: index + 1 })
    }));
    component.categoryCarouselOptions = options;
    component['cdr'].detectChanges();
    component['updateCategoryCarousel']();
    return fixture.nativeElement.querySelector('swiper-container');
  }

  beforeEach(async () => {
    register();
    monitorSvc = jasmine.createSpyObj('MonitorService', ['getAppsMonitorSummary']);
    // Other dashboard widgets are shallow; the production carousel template and Swiper elements are real.
    await configureShallowTest(DashboardComponent, [CommonModule])
      .configureTestingModule({ schemas: [NO_ERRORS_SCHEMA], providers: [{ provide: MonitorService, useValue: monitorSvc }] })
      .compileComponents();
    spyOn(DashboardComponent.prototype, 'ngOnInit').and.stub();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.width = '1100px';
    fixture.nativeElement.style.display = 'block';
    fixture.detectChanges();
  });

  afterEach(() => {
    const container: SwiperContainer | null = fixture.nativeElement.querySelector('swiper-container');
    if (container?.swiper && !container.swiper.destroyed) container.swiper.destroy(true, true);
    fixture.destroy();
  });

  it('should initialize after asynchronous cards and complex parameters are rendered', async () => {
    expect(fixture.nativeElement.querySelector('swiper-container')).toBeNull();
    const container = renderCards(5);
    expect(container).withContext(fixture.nativeElement.innerHTML.slice(0, 600)).not.toBeNull();
    await afterLayout();
    const swiper = container.swiper;
    expect(container.getAttribute('init')).toBe('false');
    expect(swiper.initialized).toBeTrue();
    expect(swiper.slides.length).toBe(5);
    expect(swiper.originalParams.breakpoints?.[1024].slidesPerView).toBe(4);
    expect(swiper.autoplay.running).toBeTrue();
    expect(swiper.navigation.nextEl).toBeTruthy();
  });

  it('should switch cards through real navigation buttons and rewind at the end', async () => {
    const container = renderCards(7);
    await afterLayout();
    const swiper = container.swiper;
    swiper.autoplay.stop();
    swiper.params.speed = 0;
    swiper.navigation.nextEl.click();
    expect(swiper.activeIndex).toBeGreaterThan(0);
    swiper.slideTo(swiper.slides.length - 1, 0);
    expect(swiper.isEnd).toBeTrue();
    swiper.navigation.nextEl.click();
    expect(swiper.activeIndex).toBe(0);
  });

  it('should actually advance from autoplay rather than only setting an option', async () => {
    const options = createCategoryCarouselOptions(7);
    options.speed = 0;
    Object.values(options.breakpoints!).forEach(breakpoint => (breakpoint.speed = 0));
    options.autoplay = { delay: 60, disableOnInteraction: false, pauseOnMouseEnter: true };
    const swiper = renderCards(7, options).swiper;
    let advancedTo = -1;
    await new Promise<void>(resolve => {
      const onAdvance = () => {
        advancedTo = swiper.activeIndex;
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(() => {
        swiper.off('autoplay', onAdvance);
        resolve();
      }, 600);
      swiper.once('autoplay', onAdvance);
    });
    expect(advancedTo).toBeGreaterThan(0);
  });

  it('should apply complex breakpoints during real container resizing', async () => {
    const container = renderCards(7, { ...createCategoryCarouselOptions(7), breakpointsBase: 'container' });
    await afterLayout();
    expect(container.swiper.params.slidesPerView).toBe(4);
    fixture.nativeElement.style.width = '700px';
    container.swiper.update();
    await afterLayout();
    expect(container.swiper.params.slidesPerView).toBe(2.75);
    fixture.nativeElement.style.width = '360px';
    container.swiper.update();
    await afterLayout();
    expect(container.swiper.params.slidesPerView).toBe(0.75);
  });

  it('should preserve the instance and navigation elements across normal data refreshes', async () => {
    const container = renderCards(5);
    await afterLayout();
    const swiper = container.swiper;
    const initialize = spyOn(container, 'initialize').and.callThrough();
    expect(renderCards(6)).toBe(container);
    await afterLayout();
    expect(container.swiper).toBe(swiper);
    expect(container.swiper.slides.length).toBe(6);
    expect(initialize).not.toHaveBeenCalled();
    expect(container.shadowRoot!.querySelectorAll('.swiper-button-next').length).toBe(1);
    expect(container.swiper.autoplay.running).toBeTrue();
  });

  it('should preserve resolved breakpoint values and a single card width across repeated summary refreshes', async () => {
    const container = renderCards(1);
    await afterLayout();
    const swiper = container.swiper;
    const initialViews = swiper.params.slidesPerView;
    const initialGroup = swiper.params.slidesPerGroup;
    const initialSpeed = swiper.params.speed;
    const initialWidth = swiper.slides[0].getBoundingClientRect().width;
    expect(initialViews).toBeGreaterThan(1);
    expect(initialWidth).toBeGreaterThan(0);
    for (let refresh = 0; refresh < 3; refresh++) {
      renderCards(1);
      await afterLayout();
      expect(container.swiper).toBe(swiper);
      expect(swiper.params.slidesPerView).toBe(initialViews);
      expect(swiper.params.slidesPerGroup).toBe(initialGroup);
      expect(swiper.params.speed).toBe(initialSpeed);
      expect(swiper.slides[0].getBoundingClientRect().width).toBeCloseTo(initialWidth, 0);
    }
  });

  it('should stop and restart autoplay when the card count changes its module mode', async () => {
    const container = renderCards(5);
    await afterLayout();
    const first = container.swiper;
    renderCards(2);
    await afterLayout();
    expect(first.destroyed).toBeTrue();
    expect(container.swiper.slides.length).toBe(2);
    expect(container.swiper.autoplay.running).toBeFalse();
    expect(container.swiper.params.rewind).toBeFalse();
    renderCards(5);
    await afterLayout();
    expect(container.swiper.slides.length).toBe(5);
    expect(container.swiper.autoplay.running).toBeTrue();
    expect(container.swiper.params.rewind).toBeTrue();
    expect(container.shadowRoot!.querySelectorAll('.swiper-button-next').length).toBe(1);
  });

  it('should recover after empty data removes and later recreates the carousel', async () => {
    const first = renderCards(5);
    const firstSwiper = first.swiper;
    renderCards(0);
    await afterLayout();
    expect(fixture.nativeElement.querySelector('swiper-container')).toBeNull();
    expect(firstSwiper.destroyed).toBeTrue();
    const next = renderCards(5);
    await afterLayout();
    expect(next).not.toBe(first);
    expect(next.swiper.initialized).toBeTrue();
    expect(next.swiper.autoplay.running).toBeTrue();
  });

  it('should destroy the real Swiper instance when leaving the dashboard', () => {
    const swiper = renderCards(5).swiper;
    fixture.destroy();
    expect(swiper.destroyed).toBeTrue();
  });

  it('should pause and resume autoplay on mouse pointer entry and exit', async () => {
    const swiper = renderCards(7).swiper;
    await afterLayout();
    swiper.el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    expect(swiper.autoplay.paused).toBeTrue();
    swiper.el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(swiper.autoplay.paused).toBeFalse();
    expect(swiper.autoplay.running).toBeTrue();
  });

  it('should recover its layout after a hidden parent becomes visible', async () => {
    fixture.nativeElement.style.display = 'none';
    const swiper = renderCards(5).swiper;
    fixture.nativeElement.style.display = 'block';
    window.dispatchEvent(new Event('resize'));
    await afterLayout();
    await afterLayout();
    expect(swiper.width).toBeGreaterThan(0);
    expect(swiper.slides.length).toBe(5);
    swiper.autoplay.stop();
    swiper.params.speed = 0;
    swiper.navigation.nextEl.click();
    expect(swiper.activeIndex).toBeGreaterThan(0);
  });

  it('should initialize and refresh from the actual asynchronous summary response path', async () => {
    component.appsCountTheme = {
      series: [
        { type: 'pie', data: [] },
        { type: 'pie', data: [] }
      ]
    };
    const categories = ['service', 'db', 'os', 'cache', 'mid', 'network'];
    function respond(count: number): void {
      const response = new Subject<any>();
      monitorSvc.getAppsMonitorSummary.and.returnValue(response.asObservable());
      component.refreshAppsCount();
      response.next({
        code: 0,
        data: {
          apps: categories.slice(0, count).map(category => ({
            category,
            app: category,
            size: 1,
            availableSize: 1,
            unAvailableSize: 0,
            unManageSize: 0
          }))
        }
      });
      response.complete();
    }
    respond(6);
    await afterLayout();
    const container: SwiperContainer = fixture.nativeElement.querySelector('swiper-container');
    expect(container.swiper.initialized).toBeTrue();
    expect(container.swiper.slides.length).toBe(6);
    expect(container.swiper.autoplay.running).toBeTrue();
    const first = container.swiper;
    const resolvedViews = first.params.slidesPerView;
    const firstWidth = first.slides[0].getBoundingClientRect().width;
    for (let refresh = 0; refresh < 3; refresh++) {
      respond(6);
      await afterLayout();
      expect(container.swiper).toBe(first);
      expect(first.slides.length).toBe(6);
      expect(first.params.slidesPerView).toBe(resolvedViews);
      expect(first.slides[0].getBoundingClientRect().width).toBeCloseTo(firstWidth, 0);
      expect(first.slides[0].getBoundingClientRect().width).toBeLessThan(first.width);
    }
    first.autoplay.stop();
    first.params.speed = 0;
    first.navigation.nextEl.click();
    expect(first.activeIndex).toBeGreaterThan(0);
    respond(2);
    await afterLayout();
    expect(container.swiper.slides.length).toBe(2);
    expect(container.swiper.autoplay.running).toBeFalse();
  });
});
