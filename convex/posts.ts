import {
  PaginationOptions,
  PaginationResult,
  StorageReader,
} from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, QueryCtx, mutation, query } from "./_generated/server";
import { mutationWithUser, queryWithUser, withUser } from "./withUser";
import { v } from "convex/values";
import { withMutationRLS, withQueryRLS } from "./rls";
import { FullUser, fillUser } from "./users";

export const createPost = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    text: v.string(),
    tags: v.array(v.string()),
    images: v.array(v.string()),
    lastUpdatedDate: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  },
  handler: withUser(
    withMutationRLS(
      async (
        { db, user },
        { postId, text, tags, images, lastUpdatedDate, status }
      ) => {
        status = status ?? "published";
        if (status === "draft") {
          const draft = await getDraft(db, user);
          if (draft) {
            if (postId) {
              if (!draft._id.equals(postId)) {
                throw new Error("you can only have one draft");
              }
            } else {
              postId = draft._id;
            }
          }
        } else if (!postId) {
          // If creating a new post, delete existing draft.
          const draft = await getDraft(db, user);
          if (draft) {
            await db.delete(draft._id);
          }
        }
        const last_updated_date = lastUpdatedDate ?? Date.now();
        if (postId) {
          const existingPost = (await db.get(postId))!;
          if (!existingPost.author.equals(user._id)) {
            throw new Error("only edit your own posts");
          }
          await db.patch(postId, {
            text,
            last_updated_date,
            status,
          });
        } else {
          postId = await db.insert("posts", {
            author: user._id,
            text,
            last_updated_date,
            images,
            status,
          });
        }
        const existingTags = await db
          .query("tags")
          .withIndex("by_postid", (q) => q.eq("postid", postId!))
          .collect();
        for (const existingTag of existingTags) {
          const newIndex = tags.indexOf(existingTag.name);
          if (newIndex >= 0 && existingTag.post_date === last_updated_date) {
            // Already exists -- don't need to update it.
            tags.splice(newIndex, 1);
          } else {
            await db.delete(existingTag._id);
          }
        }
        for (const tag of tags) {
          await db.insert("tags", {
            name: tag,
            postid: postId,
            post_date: last_updated_date,
          });
        }
      }
    )
  ),
});

export const newImageURL = mutationWithUser(async ({ storage }) => {
  return storage.generateUploadUrl();
});

export type FullPost = Omit<Doc<"posts">, "author" | "images"> & {
  author: FullUser;
  tags: Doc<"tags">[];
  images: string[];
};

const populateFullPost = async (
  db: DatabaseReader,
  me: Doc<"users">,
  storage: StorageReader,
  post: Doc<"posts">
): Promise<FullPost> => {
  const author = await fillUser(db, me, (await db.get(post.author))!);
  const tags = await db
    .query("tags")
    .withIndex("by_postid", (q) => q.eq("postid", post._id))
    .collect();
  const images = await Promise.all(
    (post.images ?? []).map(async (image) => {
      return (await storage.getUrl(image))!;
    })
  );
  return { ...post, author, tags, images };
};

const populateFullPosts = async (
  db: DatabaseReader,
  me: Doc<"users">,
  storage: StorageReader,
  posts: PaginationResult<Doc<"posts">>
): Promise<PaginationResult<FullPost>> => {
  let fullPosts = await Promise.all(
    posts.page.map((post) => populateFullPost(db, me, storage, post))
  );
  fullPosts = fullPosts.filter((post) => post.status !== "draft");
  return { ...posts, page: fullPosts };
};

export const fetchPostsByAuthor = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user: me },
      {
        authorid,
        paginationOpts,
      }: { authorid: Id<"users">; paginationOpts: PaginationOptions }
    ) => {
      const posts = await db
        .query("posts")
        .withIndex("by_author", (q) => q.eq("author", authorid))
        .order("desc")
        .paginate(paginationOpts);
      return await populateFullPosts(db, me, storage, posts);
    }
  )
);

export const fetchTimeline = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user: me },
      { paginationOpts }: { paginationOpts: PaginationOptions }
    ) => {
      const posts = await db
        .query("posts")
        .withIndex("by_date")
        .order("desc")
        .paginate(paginationOpts);
      return await populateFullPosts(db, me, storage, posts);
    }
  )
);

export const searchContent = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user: me },
      {
        search,
        paginationOpts,
      }: { search: string; paginationOpts: PaginationOptions }
    ) => {
      const posts = await db
        .query("posts")
        .withSearchIndex("by_text", (q) => q.search("text", search))
        .paginate(paginationOpts);
      return await populateFullPosts(db, me, storage, posts);
    }
  )
);

export const searchUserContent = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user: me },
      {
        search,
        user,
        paginationOpts,
      }: {
        search: string;
        user: Id<"users">;
        paginationOpts: PaginationOptions;
      }
    ) => {
      const posts = await db
        .query("posts")
        .withSearchIndex("by_text", (q) =>
          q.search("text", search).eq("author", user)
        )
        .paginate(paginationOpts);
      return await populateFullPosts(db, me, storage, posts);
    }
  )
);

export const fetchFollowing = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user },
      { paginationOpts }: { paginationOpts: PaginationOptions }
    ) => {
      const followed = (
        await db
          .query("follows")
          .withIndex("by_follower", (q) => q.eq("follower", user._id))
          .collect()
      ).map((follow) => follow.followed);
      const posts = await db
        .query("posts")
        .filter((q) =>
          q.or(...followed.map((userId) => q.eq(q.field("author"), userId)))
        )
        .order("desc")
        .paginate(paginationOpts);
      return await populateFullPosts(db, user, storage, posts);
    }
  )
);

export const fetchPostsByTag = queryWithUser(
  withQueryRLS(
    async (
      { db, storage, user: me },
      {
        tag,
        paginationOpts,
      }: { tag: string; paginationOpts: PaginationOptions }
    ) => {
      console.log("querying for tag", tag);
      const tags = await db
        .query("tags")
        .withIndex("by_tag_and_date", (q) => q.eq("name", tag))
        .order("desc")
        .paginate(paginationOpts);
      const posts = await Promise.all(
        tags.page.map(async (tag) => {
          return (await db.get(tag.postid))!;
        })
      );
      return await populateFullPosts(db, me, storage, { ...tags, page: posts });
    }
  )
);

export const fetchPost = queryWithUser(
  withQueryRLS(
    async ({ db, storage, user: me }, { post }: { post: Id<"posts"> }) => {
      const postDoc = await db.get(post);
      if (!postDoc) {
        return null;
      }
      return await populateFullPost(db, me, storage, postDoc);
    }
  )
);

const getDraft = async (db: DatabaseReader, me: Doc<"users">) => {
  return await db
    .query("posts")
    .withIndex("by_author_status", (q) =>
      q.eq("author", me._id).eq("status", "draft")
    )
    .unique();
};

export const fetchDraft = queryWithUser(
  withQueryRLS(async ({ db, storage, user: me }) => {
    const postDoc = await getDraft(db, me);
    if (!postDoc) {
      return null;
    }
    return await populateFullPost(db, me, storage, postDoc);
  })
);
