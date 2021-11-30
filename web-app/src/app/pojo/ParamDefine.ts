export class ParamDefine {
  name!: string;
  field!: string;
  type!: string;
  required: boolean | undefined;
  range: string | undefined;
  limit: number | undefined;
  option: string | undefined;
}
