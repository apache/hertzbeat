import { Component, Inject, OnInit } from '@angular/core';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';

@Component({
  selector: 'layout-passport',
  templateUrl: './passport.component.html',
  styleUrls: ['./passport.component.less']
})
export class LayoutPassportComponent implements OnInit {
  links = [
    {
      title: '欢迎使用TanCloud探云-监控云服务-tancloud.cn',
      href: 'https://tancloud.cn'
    }
  ];

  constructor(@Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService) {}

  ngOnInit(): void {
    this.tokenService.clear();
  }
}
