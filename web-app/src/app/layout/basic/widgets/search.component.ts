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
import { BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';

import { Monitor } from '../../../pojo/Monitor';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'header-search',
  template: `
    <nz-input-group [nzPrefix]="iconTpl" [nzSuffix]="loadingTpl">
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
      />
    </nz-input-group>
    <nz-autocomplete nzBackfill="false" nzDefaultActiveFirstOption #auto>
      <nz-auto-option
        *ngFor="let option of options"
        [nzValue]="option.id"
        [nzLabel]="option.name"
        [routerLink]="['/monitors/' + option.id]"
      >
        <a>
          {{ 'monitor.name' | i18n }} : {{ option.name }}
          <span style="left:50% ; position: absolute;">{{ 'monitor.host' | i18n }} : {{ option.host }}</span>
          <span style="right: 10px; position: absolute;"><i nz-icon nzType="arrow-right" nzTheme="outline"></i></span>
        </a>
      </nz-auto-option>
    </nz-autocomplete>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
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

  constructor(private el: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef, private monitorSvc: MonitorService) {}

  ngAfterViewInit(): void {
    this.qIpt = this.el.nativeElement.querySelector('.ant-input') as HTMLInputElement;
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
        // 远程加载搜索数据
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

  ngOnDestroy(): void {
    this.search$.complete();
    this.search$.unsubscribe();
  }
}
