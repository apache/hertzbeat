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

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { Subject } from 'rxjs';

import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { HeaderSetupGuideComponent } from './setup-guide.component';

describe('HeaderSetupGuideComponent', () => {
  let router: jasmine.SpyObj<Router> & { events: Subject<unknown> };

  beforeEach(() => {
    router = Object.assign(jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']), {
      events: new Subject<unknown>()
    });

    TestBed.configureTestingModule({
      declarations: [HeaderSetupGuideComponent],
      providers: [
        { provide: MonitorService, useValue: {} },
        { provide: EntityService, useValue: {} },
        { provide: Router, useValue: router },
        { provide: I18NService, useValue: { fanyi: (key: string) => key } }
      ]
    });
    TestBed.overrideComponent(HeaderSetupGuideComponent, { set: { template: '' } });
  });

  it('should route otlp setup actions to the unified ingestion center', () => {
    const fixture = TestBed.createComponent(HeaderSetupGuideComponent);

    fixture.componentInstance.openAction('otlp');

    expect(router.navigate).toHaveBeenCalledWith(['/ingestion/otlp'], { queryParams: { signal: 'logs' } });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
