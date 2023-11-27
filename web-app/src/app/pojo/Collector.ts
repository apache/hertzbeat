export class Collector {
  id!: number;
  name!: string;
  ip!: string;
  // public or private
  mode!: string;
  // collector status: 0-online 1-offline
  status!: number;
  gmtCreate!: number;
  gmtUpdate!: number;
  tmp!: any;
}
