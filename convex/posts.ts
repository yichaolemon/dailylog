import { PaginationOptions, PaginationResult, StorageReader } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, QueryCtx, mutation, query } from "./_generated/server";
import { mutationWithUser, queryWithUser, withUser } from "./withUser";
import { v } from "convex/values";

export const createPost = mutation({
  args: {
    postId: v.optional(v.id("posts")),
    text: v.string(),
    tags: v.array(v.string()),
    images: v.array(v.string()),
    lastUpdatedDate: v.optional(v.number()),
  },
  handler: withUser(async ({db, user}, {postId, text, tags, images, lastUpdatedDate}) => {
    const last_updated_date = lastUpdatedDate ?? Date.now();
    if (postId) {
      const existingPost = (await db.get(postId))!;
      if (!existingPost.author.equals(user._id)) {
        throw new Error("only edit your own posts");
      }
      await db.patch(postId, {
        text,
        last_updated_date,
      });
    } else {
      postId = await db.insert("posts", {
        author: user._id,
        text,
        last_updated_date,
        images,
      });
    }
    const existingTags = await db.query("tags").withIndex("by_postid", q => q.eq("postid", postId!)).collect();
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
      })
    }
  }),
});

export const newImageURL = mutationWithUser(async ({storage}) => {
  return storage.generateUploadUrl();
});

export type FullPost = Omit<Doc<'posts'>, 'author' | 'images'> & {author: Doc<'users'>, tags: Doc<'tags'>[], images: string[]};

const populateFullPost = async (db: DatabaseReader, storage: StorageReader, post: Doc<"posts">): Promise<FullPost> => {
  const author = (await db.get(post.author))!;
  const tags = await db.query("tags").withIndex("by_postid", q => q.eq('postid', post._id)).collect();
  const images = await Promise.all((post.images ?? []).map(async (image) => {
    return (await storage.getUrl(image))!
  }));
  return {...post, author, tags, images}; 
}

const populateFullPosts = async (db: DatabaseReader, storage: StorageReader, posts: PaginationResult<Doc<"posts">>): Promise<PaginationResult<FullPost>> => {
  const fullPosts = await Promise.all(posts.page.map((post) => populateFullPost(db, storage, post)));
  return {...posts, page: fullPosts};
};

export const fetchPostsByAuthor = queryWithUser(async ({db, storage}: QueryCtx, {authorid, paginationOpts}: {authorid: Id<'users'>, paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .withIndex("by_author", q => 
    q.eq("author", authorid)
    )
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, storage, posts);
});

export const fetchTimeline = queryWithUser(async ({db, storage}: QueryCtx, {paginationOpts}: {paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .withIndex("by_date")
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, storage, posts);
});

export const searchContent = queryWithUser(async ({db, storage}, {search, paginationOpts}: {search: string, paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .withSearchIndex('by_text', q => q.search('text', search))
    .paginate(paginationOpts);
  return await populateFullPosts(db, storage, posts);
});

export const searchUserContent = queryWithUser(async ({db, storage}, {search, user, paginationOpts}: {search: string, user: Id<"users">, paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .withSearchIndex('by_text', q => q.search('text', search).eq('author', user))
    .paginate(paginationOpts);
  return await populateFullPosts(db, storage, posts);
});

export const fetchFollowing = queryWithUser(async ({db, storage, user}, {paginationOpts}: {paginationOpts: PaginationOptions}) => {
  const followed = (await db.query("follows").withIndex('by_follower', q => q.eq('follower', user._id)).collect()).map((follow) => follow.followed);
  const posts = await db.query("posts")
    .filter(q => q.or(...followed.map((userId) => q.eq(q.field('author'), userId))))
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, storage, posts);
});

export const fetchPostsByTag = queryWithUser(async ({db, storage}: QueryCtx, {tag, paginationOpts}: {tag: string, paginationOpts: PaginationOptions}) => {
  console.log("querying for tag", tag);
  const tags = await db.query("tags").withIndex("by_tag_and_date", q => q.eq('name', tag)).order('desc').paginate(paginationOpts);
  const posts = await Promise.all(tags.page.map(async (tag) => {
    return (await db.get(tag.postid))!;
  }));
  return await populateFullPosts(db, storage, {...tags, page: posts});
});

export const fetchPost = queryWithUser(async ({db, storage}: QueryCtx, {post}: {post: Id<"posts">}) => {
  const postDoc = await db.get(post);
  if (!postDoc) {
    return null;
  }
  return await populateFullPost(db, storage, postDoc);
});
