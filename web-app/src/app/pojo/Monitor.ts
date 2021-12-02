export class Monitor {
  id!: number;
  name!: string;
  app!: string;
  host!: string;
  intervals: number = 600;
  status!: number;
  description!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
