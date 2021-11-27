import { Component, Inject } from '@angular/core';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { _HttpClient } from '@delon/theme';

@Component({
  selector: 'exception-trigger',
  template: `
    <div class="pt-lg">
      <nz-card>
        <button *ngFor="let t of types" (click)="go(t)" nz-button nzDanger>触发{{ t }}</button>
        <button nz-button nzType="link" (click)="refresh()">触发刷新Token</button>
      </nz-card>
    </div>
  `
})
export class ExceptionTriggerComponent {
  types = [401, 403, 404, 500];

  constructor(private http: _HttpClient, @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService) {}

  go(type: number): void {
    this.http.get(`/api/${type}`).subscribe();
  }

  refresh(): void {
    this.tokenService.set({ token: 'invalid-token' });
    // 必须提供一个后端地址，无法通过 Mock 来模拟
    this.http.post(`https://localhost:5001/auth`).subscribe(
      res => console.warn('成功', res),
      err => {
        console.log('最后结果失败', err);
      }
    );
  }
}
