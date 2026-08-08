/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export type SetupAdministratorDraft = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type SetupAdministratorRequest = {
  username: string;
  password: string;
};

export function administratorFormComplete(draft: SetupAdministratorDraft) {
  return nonBlank(draft.username) && nonBlank(draft.password) && draft.password === draft.confirmPassword;
}

export function createAdministratorRequest(username: string, password: string): SetupAdministratorRequest {
  return { username, password };
}

function nonBlank(value: string) {
  return value.trim().length > 0;
}
