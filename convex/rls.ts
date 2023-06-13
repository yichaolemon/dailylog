import { DataModel, Doc, Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";
import { RowLevelSecurity } from "./rowLevelSecurity";

const isFollowed = async (
  db: DatabaseReader,
  user: Doc<"users">,
  author: Id<"users">
) => {
  if (user._id === author) {
    return true;
  }
  const followed = await db
    .query("follows")
    .withIndex("by_follower", (q) => q.eq("follower", user._id))
    .collect();
  for (const followDoc of followed) {
    if (followDoc.accepted && followDoc.followed === author) {
      return true;
    }
  }
  return false;
};

export const { withQueryRLS, withMutationRLS } = RowLevelSecurity<
  { db: DatabaseReader; user: Doc<"users"> },
  DataModel
>({
  posts: {
    read: async ({ db, user }, post) => {
      if (user._id !== post.author) {
        // Hide drafts from others.
        if (post.status === "draft") {
          return false;
        }
      }
      return await isFollowed(db, user, post.author);
    },
    modify: async ({ user }, post) => {
      return user._id === post.author;
    },
    insert: async ({ user }, post) => {
      return user._id === post.author;
    },
  },
  follows: {
    read: async ({ user }, follow) => {
      return user._id === follow.followed || user._id === follow.follower;
    },
    insert: async ({ user }, follow) => {
      return user._id === follow.follower;
    },
    modify: async ({ user }, follow) => {
      return user._id === follow.follower || user._id === follow.followed;
    },
  },
  tags: {
    read: async ({ db, user }, tag) => {
      const post = await db.get(tag.postid);
      if (!post) {
        return true;
      }
      return await isFollowed(db, user, post.author);
    },
    modify: async ({ db, user }, tag) => {
      const post = await db.get(tag.postid);
      if (!post) {
        return false;
      }
      return post.author === user._id;
    },
    insert: async ({ db, user }, tag) => {
      const post = await db.get(tag.postid);
      if (!post) {
        return false;
      }
      return post.author === user._id;
    },
  },
});
