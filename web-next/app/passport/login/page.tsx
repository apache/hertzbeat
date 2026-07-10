import React, { Suspense } from 'react';
import { LoginForm } from '@/components/pages/login-form';
import {
  readPassportLoginRouteState,
  type PassportLoginSearchParams
} from '@/lib/passport-login/controller';

export default async function PassportLoginPage(props: {
  searchParams?: Promise<PassportLoginSearchParams>;
}) {
  const { searchParams } = props ?? {};
  const resolvedSearchParams = await searchParams;
  const routeState = readPassportLoginRouteState(resolvedSearchParams);

  return (
    <Suspense fallback={null}>
      <LoginForm initialRouteState={routeState} />
    </Suspense>
  );
}
