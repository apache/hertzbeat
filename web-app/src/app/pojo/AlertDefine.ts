export class AlertDefine {
  id!: number;
  app!: string;
  metric!: string;
  field!: string;
  preset: boolean = true;
  expr!: string;
  // 告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色
  priority: number = 2;
  times: number = 3;
  enable: boolean = true;
  template!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
