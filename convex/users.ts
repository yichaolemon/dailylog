import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, mutation, query } from "./_generated/server";
import { mutationWithUser, queryWithUser, withUser } from "./withUser";
import { v } from "convex/values";

export const storeUser = mutation(async ({ db, auth }) => {
  const identity = await auth.getUserIdentity();
  console.log(identity);
  if (!identity) {
    throw new Error("Called storeUser without authentication present");
  }
  
  // Check if we've already stored this identity before.
  const user = await db
  .query("users")
  .withIndex("by_token", q =>
  q.eq("tokenIdentifier", identity.tokenIdentifier)
  )
  .unique();
  if (user !== null) {
    // If we've seen this identity before but the name has changed, patch the value.
    if (user.name != identity.givenName) {
      await db.patch(user._id, { name: identity.givenName });
    }
    return user._id;
  }
  // If it's a new identity, create a new `User`.
  return db.insert("users", {
    name: identity.givenName!,
    tokenIdentifier: identity.tokenIdentifier,
  });
});

const getFollow = async (db: DatabaseReader, follower: Id<"users">, followed: Id<"users">): Promise<Doc<"follows"> | null> => {
  return await db.query("follows")
    .withIndex("by_follower", q => q.eq("follower", follower).eq("followed", followed))
    .unique();
}

export const follow = mutation({
  args: {user: v.id("users")},
  handler: withUser(async ({db, user}, {user: userId}) => {
    if (await getFollow(db, user._id, userId)) {
      console.log("already followed");
      return;
    }
    await db.insert("follows", {
      follower: user._id,
      followed: userId,
    });
  }),
}); 

export const unfollow = mutation({
  args: {user: v.id("users")},
  handler: withUser(async ({db, user}, {user: userId}: {user: Id<"users">}) => {
    const follow = await getFollow(db, user._id, userId);
    if (!follow) {
      console.log("already not following");
      return;
    }
    await db.delete(follow._id);
  }),
}); 

export const getUser = queryWithUser(async ({db, user}, {user: userId}: {user: Id<"users">}) => {
  const userDoc = (await db.get(userId))!;
  const followed = (await getFollow(db, user._id, userId)) !== null;
  const isMe = user._id.equals(userId);
  return {...userDoc, followed, isMe};
});
