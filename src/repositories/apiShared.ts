/** Shared guard for all API repositories: never build a path with a fake store. */

import { assertApiReady, getApiConfig } from "@/src/api/client";

export function currentStoreId(): string {
  assertApiReady();
  return getApiConfig().storeId;
}
