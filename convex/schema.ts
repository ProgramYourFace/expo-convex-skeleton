import { zodOutputToConvex } from 'convex-helpers/server/zod4';
import { defineSchema, defineTable } from 'convex/server';
import { userZSchema } from '../schemas/user';

export default defineSchema({
  users: defineTable(zodOutputToConvex(userZSchema)).index('by_userId', ['userId']),
});
