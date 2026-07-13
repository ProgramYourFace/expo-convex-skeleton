import z from 'zod';

// App-side mirror of the WorkOS user. Synced via AuthKit events in
// convex/users.ts — WorkOS remains the source of truth for identity fields.
export const userZSchema = z.object({
  userId: z.string(), // WorkOS user id (identity.subject)
  email: z.string().optional(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
});

export type User = z.infer<typeof userZSchema>;
