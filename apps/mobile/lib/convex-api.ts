/**
 * Untyped Convex API for optional HuddleStat Cloud sync.
 *
 * The open-source tagging app does not ship platform Convex codegen.
 * Mutations must match huddlestat/convex (games, plays).
 */
import { anyApi } from "convex/server";

export const api = anyApi;

/** Convex document ids from cloud sync (opaque strings). */
export type CloudGameId = string & { readonly __brand: "CloudGameId" };
export type CloudPlayId = string & { readonly __brand: "CloudPlayId" };
