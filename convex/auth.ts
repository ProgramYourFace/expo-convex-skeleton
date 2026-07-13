import { AuthKit } from '@convex-dev/workos-authkit';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

export const authKit: AuthKit<DataModel> = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions: {
    authKitEvent: internal.users.authKitEvent,
  },
});
