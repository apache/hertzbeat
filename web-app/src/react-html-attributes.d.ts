/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    inert?: boolean | '' | undefined;
  }
}
