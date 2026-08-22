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

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignalWorkspaceComponent } from './signal-workspace.component';

@Component({
  standalone: true,
  imports: [SignalWorkspaceComponent],
  template: `
    <app-signal-workspace title="Metrics" subtitle="Inspect samples" queryLabel="Time range" [showQueryPanel]="showQueryPanel">
      <button workspace-actions type="button">Signals</button>
      <div workspace-time>Last 30 minutes</div>
      <div workspace-filters
        ><label>PromQL<input /></label
      ></div>
      <div workspace-summary>4 series</div>
      <div workspace-results>Evidence</div>
    </app-signal-workspace>
  `
})
class WorkspaceHostComponent {
  showQueryPanel = true;
}

describe('SignalWorkspaceComponent', () => {
  let fixture: ComponentFixture<WorkspaceHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkspaceHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(WorkspaceHostComponent);
    fixture.detectChanges();
  });

  it('creates one ordered investigation workspace around projected signal content', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.signal-workspace-heading h1')?.textContent).toContain('Metrics');
    expect(element.querySelector('.signal-workspace-actions [workspace-actions]')).not.toBeNull();
    expect(element.querySelector('.signal-query-panel [workspace-time]')?.textContent).toContain('Last 30 minutes');
    expect(element.querySelector('.signal-query-panel [workspace-filters] label')?.textContent).toContain('PromQL');
    expect(element.querySelector('[workspace-summary]')?.textContent).toContain('4 series');
    expect(element.querySelector('[workspace-results]')?.textContent).toContain('Evidence');
  });

  it('removes the historical query surface in live-stream mode', () => {
    fixture.componentInstance.showQueryPanel = false;
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.signal-query-panel')).toBeNull();
  });
});
