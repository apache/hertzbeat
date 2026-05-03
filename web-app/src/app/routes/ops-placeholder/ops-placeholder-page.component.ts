import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { OpsWorkspaceFacade } from '../../core/ops-workspace/ops-workspace.facade';
import { ActivityTimelineComponent, ActivityTimelineItem } from '../../shared/components/activity-timeline/activity-timeline.component';
import { PageShellAction, PageShellComponent } from '../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'app-ops-placeholder-page',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzEmptyModule, NzTagModule, PageShellComponent, ActivityTimelineComponent],
  template: `
    <app-page-shell
      kicker="Dark Ops"
      [title]="title"
      [subtitle]="subtitle"
      [showAside]="true"
      [actions]="actions"
      (actionSelected)="onAction($event)"
    >
      <div pageContent class="ops-placeholder-content">
        <section class="ops-placeholder-panel">
          <div class="ops-placeholder-label">V1 shell is live</div>
          <div class="ops-placeholder-copy">
            This surface is already inside the shared operational context. It inherits the global time range, filter chips,
            drawer patterns, and navigation language even before the domain adapter is fully connected.
          </div>
          <div class="ops-placeholder-tags">
            <nz-tag *ngFor="let tag of tags">{{ tag }}</nz-tag>
          </div>
        </section>

        <section class="ops-placeholder-panel">
          <nz-empty nzNotFoundImage="simple" [nzNotFoundContent]="emptyTpl"></nz-empty>
          <ng-template #emptyTpl>
            <div class="ops-placeholder-empty-title">Domain adapter comes next</div>
            <div class="ops-placeholder-empty-copy">The product chrome is already unified, so plugging in data becomes incremental instead of structural.</div>
          </ng-template>
        </section>
      </div>

      <div pageAside>
        <app-activity-timeline [title]="'Launch checklist'" [items]="timeline"></app-activity-timeline>
      </div>
    </app-page-shell>
  `,
  styleUrl: './ops-placeholder-page.component.less'
})
export class OpsPlaceholderPageComponent {
  readonly title: string;
  readonly subtitle: string;
  readonly tags: string[];
  readonly timeline: ActivityTimelineItem[];
  readonly actions: PageShellAction[] = [
    { key: 'open-drawer', label: 'Open context', tone: 'primary' },
    { key: 'go-entities', label: 'Browse entities' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly opsFacade: OpsWorkspaceFacade
  ) {
    this.title = this.route.snapshot.data['title'] ?? 'Ops Surface';
    this.subtitle = this.route.snapshot.data['subtitle'] ?? 'Shared shell ready for domain adapters.';
    this.tags = this.route.snapshot.data['tags'] ?? ['shared shell', 'signals facade', 'drawer-first'];
    this.timeline = [
      { title: 'Unify navigation and time context', detail: 'Done in this batch.', tone: 'success' },
      { title: 'Attach domain adapters', detail: 'Next step after product shell stabilizes.', tone: 'warning' },
      { title: 'Keep drill-downs inside the same context', detail: 'Drawer and route handoff are already reserved.', tone: 'info' }
    ];
  }

  onAction(actionKey: string): void {
    if (actionKey === 'go-entities') {
      void this.router.navigateByUrl('/entities');
      return;
    }
    this.opsFacade.openDrawer({
      kind: 'custom',
      title: this.title,
      subtitle: 'Domain adapter placeholder',
      description: 'This route is already inside the shared dark-ops shell and can accept domain data without another layout rewrite.',
      tags: this.tags,
      sections: [
        { label: 'Status', value: 'shell ready' },
        { label: 'Next step', value: 'wire the first real adapter' }
      ]
    });
  }
}
