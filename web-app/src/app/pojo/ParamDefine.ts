export class ParamDefine {
  name!: string;
  field!: string;
  type!: string;
  required: boolean | undefined;
  defaultValue: string | undefined;
  placeholder!: string;
  range: string | undefined;
  limit: number | undefined;
  options: string | undefined;
}
