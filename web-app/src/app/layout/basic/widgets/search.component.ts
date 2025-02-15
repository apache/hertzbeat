import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  Output
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, filter } from 'rxjs/operators';

import { Monitor } from '../../../pojo/Monitor';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'header-search',
  template: `
    <nz-input-group [nzPrefix]="iconTpl" [nzSuffix]="loadingTpl" class="search-input-group">
      <ng-template #iconTpl>
        <i nz-icon [nzType]="focus ? 'arrow-down' : 'search'"></i>
      </ng-template>
      <ng-template #loadingTpl>
        <i *ngIf="loading" nz-icon nzType="loading"></i>
      </ng-template>
      <input
        type="text"
        nz-input
        [(ngModel)]="q"
        [nzAutocomplete]="auto"
        (input)="search($event)"
        (focus)="qFocus()"
        (blur)="qBlur()"
        [attr.placeholder]="'menu.search.placeholder' | i18n"
        class="search-input"
      />
    </nz-input-group>
    <nz-autocomplete nzBackfill="false" nzDefaultActiveFirstOption #auto class="search-autocomplete">
      <nz-auto-option
        *ngFor="let option of options"
        [nzValue]="option.id"
        [nzLabel]="option.name"
        (click)="onOptionSelect(option)"
        class="search-option"
      >
        <a>
          <div class="monitor-info">
            <div>
              <span class="monitor-name">{{ option.name }}</span>
              <span class="monitor-host">{{ option.host }}</span>
            </div>
            <div class="monitor-labels">
              <span *ngFor="let label of option.labels | keyvalue" class="monitor-label">{{ label.key + ' : ' + label.value }}</span>
            </div>
          </div>
        </a>
      </nz-auto-option>
    </nz-autocomplete>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./search.component.less']
})
export class HeaderSearchComponent implements AfterViewInit, OnDestroy {
  q = '';
  qIpt: HTMLInputElement | null = null;
  options: Monitor[] = [];
  search$ = new BehaviorSubject('');
  loading = false;

  @HostBinding('class.alain-default__search-focus')
  focus = false;
  @HostBinding('class.alain-default__search-toggled')
  searchToggled = false;

  @Input()
  set toggleChange(value: boolean) {
    if (typeof value === 'undefined') {
      return;
    }
    this.searchToggled = value;
    this.focus = value;
    if (value) {
      setTimeout(() => this.qIpt!.focus());
    }
  }
  @Output() readonly toggleChangeChange = new EventEmitter<boolean>();

  constructor(
    private router: Router,
    private el: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private monitorSvc: MonitorService
  ) {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.resetSearch();
    });
  }

  ngAfterViewInit(): void {
    this.qIpt = this.el.nativeElement.querySelector('.ant-input') as HTMLInputElement;
    this.initOptions();
  }

  initOptions() {
    this.search$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap({
          complete: () => {
            this.loading = true;
          }
        })
      )
      .subscribe(value => {
        // Remote loading of search data
        let searchMonitors$ = this.monitorSvc.searchMonitors(undefined, undefined, value, 9, 0, 10).subscribe(
          message => {
            this.loading = false;
            searchMonitors$.unsubscribe();
            if (message.code === 0) {
              let page = message.data;
              if (page.content != undefined) {
                this.options = page.content;
              } else {
                this.options = [];
              }
              this.cdr.detectChanges();
            } else {
              console.warn(message.msg);
            }
          },
          error => {
            this.loading = false;
            searchMonitors$.unsubscribe();
            console.error(error.msg);
          }
        );
      });
  }

  qFocus(): void {
    this.focus = true;
  }

  qBlur(): void {
    this.focus = false;
    this.searchToggled = false;
    this.options = [];
    this.toggleChangeChange.emit(false);
  }

  search(ev: Event): void {
    this.search$.next((ev.target as HTMLInputElement).value);
  }

  onOptionSelect(option: any) {
    this.router.navigate([`/monitors/${option.id}`]);
    this.resetSearch();
    if (this.qIpt) {
      this.qIpt.blur();
    }
    this.qBlur();
  }

  resetSearch() {
    if (this.qIpt) {
      this.qIpt!.value = '';
    }
    this.initOptions();
  }

  ngOnDestroy(): void {
    this.search$.complete();
    this.search$.unsubscribe();
  }
}
