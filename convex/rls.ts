import { DataModel, Doc, Id } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";
import { RowLevelSecurity } from "./rowLevelSecurity";

const isFollowed = async (
  db: DatabaseReader,
  user: Doc<"users">,
  author: Id<"users">
) => {
  if (user._id.equals(author)) {
    return true;
  }
  const followed = await db
    .query("follows")
    .withIndex("by_follower", (q) => q.eq("follower", user._id))
    .collect();
  for (const followDoc of followed) {
    if (followDoc.accepted && followDoc.followed.equals(author)) {
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
      if (!user._id.equals(post.author)) {
        // Hide drafts from others.
        if (post.status === "draft") {
          return false;
        }
      }
      return await isFollowed(db, user, post.author);
    },
    modify: async ({ user }, post) => {
      return user._id.equals(post.author);
    },
    insert: async ({ user }, post) => {
      return user._id.equals(post.author);
    },
  },
  follows: {
    read: async ({ user }, follow) => {
      return (
        user._id.equals(follow.followed) || user._id.equals(follow.follower)
      );
    },
    insert: async ({ user }, follow) => {
      return user._id.equals(follow.follower);
    },
    modify: async ({ user }, follow) => {
      return user._id.equals(follow.follower) || user._id.equals(follow.followed);
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
      return post.author.equals(user._id);
    },
    insert: async ({ db, user }, tag) => {
      const post = await db.get(tag.postid);
      if (!post) {
        return false;
      }
      return post.author.equals(user._id);
    },
  },
});
