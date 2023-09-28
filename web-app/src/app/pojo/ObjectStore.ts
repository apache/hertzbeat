export class ObjectStore<T> {
  type: ObjectStoreType = ObjectStoreType.FILE;
  config!: T;
  appDefineStoreType!: ObjectStoreType;
}

export enum ObjectStoreType {
  /**
   * 本地文件
   */
  FILE = 'FILE',

  /**
   * <a href="https://support.huaweicloud.com/obs/index.html">华为云OBS</a>
   */
  OBS = 'OBS'
}

export class ObsConfig {
  accessKey!: string;
  secretKey!: string;
  bucketName!: string;
  endpoint!: string;
  savePath: string = 'hertzbeat';
}
