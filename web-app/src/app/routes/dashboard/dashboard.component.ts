import {ChangeDetectionStrategy, Component, ViewChild} from '@angular/core';
import {NzMessageService} from "ng-zorro-antd/message";
import {G2PieClickItem, G2PieComponent, G2PieData} from "@delon/chart/pie";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {

  @ViewChild('pie', { static: false }) readonly pie!: G2PieComponent;
  salesPieData: G2PieData[] = [];
  total = '';

  constructor(private msg: NzMessageService){}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    const rv = (min: number = 0, max: number = 5000) => Math.floor(Math.random() * (max - min + 1) + min);
    this.salesPieData = [
      {
        x: '应用服务',
        y: rv(),
      },
      {
        x: '数据库',
        y: rv(),
      },
      {
        x: '中间件',
        y: rv(),
      },
      {
        x: '自定义',
        y: rv(),
      },
      {
        x: '其它',
        y: rv(),
      },
    ];
    this.total = `${this.salesPieData.reduce((pre, now) => now.y + pre, 0).toFixed(2)}`;
    if (this.pie) {
      // 等待组件渲染
      setTimeout(() => this.pie.changeData());
    }
  }

  format(val: number): string {
    return `${val.toFixed()}`;
  }

  handleClick(data: G2PieClickItem): void {
    this.msg.info(`${data.item.x} - ${data.item.y}`);
  }

}
