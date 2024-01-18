export class Tag {
  id!: number;
  name!: string;
  value!: string;
  color: string = this.getRandomColor();
  description!: string;
  // 标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预置
  type!: number;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;

  private getRandomColor(): string {
    const colorArray = Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]);
    const colorCode = `#${colorArray.join('')}`;
    return colorCode;
  }
}
