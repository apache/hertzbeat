/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export class ExploreSignalContractError extends Error {
  constructor(message = 'Explore signal response does not match its contract') {
    super(message);
    this.name = 'ExploreSignalContractError';
  }
}
