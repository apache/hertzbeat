import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timezone'
})
export class TimezonePipe implements PipeTransform {
  timeZone: string = 'Asia/Shanghai';

  constructor() {
    this.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (this.timeZone == undefined) {
      this.timeZone = 'Asia/Shanghai';
    }
  }

  transform(value: any): string {
    return formatDate(value, 'YYYY-MM-DD HH:mm:ss', 'zh-cn');
  }
}
