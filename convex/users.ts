import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, mutation, query } from "./_generated/server";
import { withMutationRLS, withQueryRLS } from "./rls";
import { mutationWithUser, queryWithUser, withUser } from "./withUser";
import { v } from "convex/values";

export const storeUser = mutation(
  withMutationRLS(async ({ db, auth }) => {
    const identity = await auth.getUserIdentity();
    console.log(identity);
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    const user = await db
      .query("users")
      .withIndex("by_token", (q) =>
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
  })
);

const getFollow = async (
  db: DatabaseReader,
  follower: Id<"users">,
  followed: Id<"users">
): Promise<Doc<"follows"> | null> => {
  return await db
    .query("follows")
    .withIndex("by_follower", (q) =>
      q.eq("follower", follower).eq("followed", followed)
    )
    .unique();
};

export const follow = mutation({
  args: { user: v.id("users") },
  handler: withUser(
    withMutationRLS(async ({ db, user }, { user: userId }) => {
      if (await getFollow(db, user._id, userId)) {
        console.log("already followed");
        return;
      }
      await db.insert("follows", {
        follower: user._id,
        followed: userId,
        accepted: false,
      });
    })
  ),
});

export const acceptFollow = mutation({
  args: { user: v.id("users") },
  handler: withUser(
    withMutationRLS(async ({ db, user }, { user: userId }) => {
      const follow = await getFollow(db, userId, user._id);
      if (!follow) {
        throw new Error("no follow request");
      }
      if (follow.accepted) {
        console.log("already accepted");
        return;
      }
      await db.patch(follow._id, {
        accepted: true,
      });
    })
  ),
});

export const rejectFollow = mutation({
  args: { user: v.id("users") },
  handler: withUser(
    withMutationRLS(async ({ db, user }, { user: userId }) => {
      const follow = await getFollow(db, userId, user._id);
      if (!follow) {
        throw new Error("no follow request");
      }
      if (!follow.accepted) {
        console.log("not accepted");
        return;
      }
      await db.patch(follow._id, {
        accepted: false,
      });
    })
  ),
});

export const unfollow = mutation({
  args: { user: v.id("users") },
  handler: withUser(
    withMutationRLS(
      async ({ db, user }, { user: userId }: { user: Id<"users"> }) => {
        const follow = await getFollow(db, user._id, userId);
        if (!follow) {
          console.log("already not following");
          return;
        }
        await db.delete(follow._id);
      }
    )
  ),
});

export type FullUser = Doc<"users"> & {
  followRequested: boolean;
  followed: boolean;
  followsMe: boolean;
  followsMeRequested: boolean;
  isMe: boolean;
};

export const fillUser = async (
  db: DatabaseReader,
  me: Doc<"users">,
  user: Doc<"users">
): Promise<FullUser> => {
  const follow = await getFollow(db, me._id, user._id);
  const followRequested = follow !== null;
  const followed = followRequested && !!follow.accepted;
  const followsMeDoc = await getFollow(db, user._id, me._id);
  const followsMeRequested = followsMeDoc !== null;
  const followsMe = followsMeRequested && !!followsMeDoc.accepted;
  const isMe = me._id.equals(user._id);
  return {
    ...user,
    followed,
    followRequested,
    followsMe,
    followsMeRequested,
    isMe,
  };
};

export const getUser = queryWithUser(
  withQueryRLS(
    async ({ db, user: me }, { user: userId }: { user: Id<"users"> }) => {
      const userDoc = (await db.get(userId))!;
      return await fillUser(db, me, userDoc);
    }
  )
);

export const allUsers = queryWithUser(
  withQueryRLS(async ({ db, user: me }) => {
    const users = await db.query("users").collect();
    return await Promise.all(users.map((user) => fillUser(db, me, user)));
  })
);
