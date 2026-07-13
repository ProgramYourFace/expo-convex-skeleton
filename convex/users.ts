import z from 'zod';
import { authKit } from './auth';
import { zQuery } from './lib/convex';

// Keep the users table in sync with WorkOS via AuthKit webhook events.
// WorkOS owns identity; we only mirror what the app needs to render.
export const { authKitEvent } = authKit.events({
  'user.created': async (ctx, event) => {
    const data = event.data;
    const existing = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', data.id))
      .unique();
    if (!existing) {
      await ctx.db.insert('users', {
        userId: data.id,
        email: data.email ?? undefined,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        profilePictureUrl: data.profilePictureUrl ?? null,
      });
    }
  },
  'user.updated': async (ctx, event) => {
    const data = event.data;
    const existing = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', data.id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: data.email ?? existing.email,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        profilePictureUrl: data.profilePictureUrl ?? null,
      });
    }
  },
  'user.deleted': async (ctx, event) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', event.data.id))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// The signed-in user's mirrored record, or null when signed out (or when the
// user.created event hasn't landed yet — treat null as "not ready").
export const me = zQuery({
  args: {},
  returns: z.union([
    z.object({
      userId: z.string(),
      email: z.string().optional(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      profilePictureUrl: z.string().nullable(),
    }),
    z.null(),
  ]),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query('users')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
      .unique();
    if (!user) return null;
    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
    };
  },
});
