import { redirect } from 'next/navigation';
import { buildEntityListCompatRouteUrl } from '../../lib/entity-manage/query-state';

export default function EntitiesNotFound() {
  redirect(buildEntityListCompatRouteUrl());
}
