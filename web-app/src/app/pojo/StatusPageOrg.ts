export class StatusPageOrg {
  id!: number;
  name!: string;
  // org current state: 0-All Systems Operational 1-Some Systems Abnormal 2-All Systems Abnormal
  state!: number;
  description!: string;
  home!: string;
  logo!: string;
  feedback!: string;
  color!: string;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
