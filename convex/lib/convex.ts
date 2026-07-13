import { NoOp } from 'convex-helpers/server/customFunctions';
import {
  convexToZod,
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
} from 'convex-helpers/server/zod4';
import { paginationOptsValidator } from 'convex/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from '../_generated/server';

export const zQuery = zCustomQuery(query, NoOp);
export const zMutation = zCustomMutation(mutation, NoOp);

export const zInternalQuery = zCustomQuery(internalQuery, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);

export const zInternalAction = zCustomAction(internalAction, NoOp);

export const zPaginationOpts = convexToZod(paginationOptsValidator);
