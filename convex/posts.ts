import { PaginationOptions, PaginationResult } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, QueryCtx, mutation, query } from "./_generated/server";
import { mutationWithUser, queryWithUser } from "./withUser";

export const createPost = mutationWithUser(async ({db, user}, {text, tags}: {text: string, tags: string[]}) => {
  const last_updated_date = Date.now();
  const postid = await db.insert("posts", {
    author: user._id,
    text: text,
    last_updated_date: last_updated_date,
  });
  for (const tag of tags) {
    await db.insert("tags", {
      name: tag,
      postid: postid,
      post_date: last_updated_date,
    })
  }
});

export type FullPost = Omit<Doc<'posts'>, 'author'> & {author: Doc<'users'>, tags: Doc<'tags'>[]};

const populateFullPost = async (db: DatabaseReader, post: Doc<"posts">): Promise<FullPost> => {
  const author = (await db.get(post.author))!;
  const tags = await db.query("tags").withIndex("by_postid", q => q.eq('postid', post._id)).collect();
  return {...post, author, tags}; 
}

const populateFullPosts = async (db: DatabaseReader, posts: PaginationResult<Doc<"posts">>): Promise<PaginationResult<FullPost>> => {
  const fullPosts = await Promise.all(posts.page.map((post) => populateFullPost(db, post)));
  return {...posts, page: fullPosts};
};

export const fetchPostsByAuthor = queryWithUser(async ({db}: QueryCtx, {authorid, paginationOpts}: {authorid: Id<'users'>, paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .withIndex("by_author", q => 
    q.eq("author", authorid)
    )
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, posts);
});

export const fetchTimeline = queryWithUser(async ({db}: QueryCtx, {paginationOpts}: {paginationOpts: PaginationOptions}) => {
  const posts = await db.query("posts")
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, posts);
});

export const fetchFollowing = queryWithUser(async ({db, user}, {paginationOpts}: {paginationOpts: PaginationOptions}) => {
  const followed = (await db.query("follows").withIndex('by_follower', q => q.eq('follower', user._id)).collect()).map((follow) => follow.followed);
  const posts = await db.query("posts")
    .filter(q => q.or(...followed.map((userId) => q.eq(q.field('author'), userId))))
    .order("desc")
    .paginate(paginationOpts);
  return await populateFullPosts(db, posts);
});

export const fetchPostsByTag = queryWithUser(async ({db}: QueryCtx, {tag, paginationOpts}: {tag: string, paginationOpts: PaginationOptions}) => {
  console.log("querying for tag", tag);
  const tags = await db.query("tags").withIndex("by_tag_and_date", q => q.eq('name', tag)).order('desc').paginate(paginationOpts);
  const posts = await Promise.all(tags.page.map(async (tag) => {
    return (await db.get(tag.postid))!;
  }));
  return await populateFullPosts(db, {...tags, page: posts});
});

export const fetchPost = queryWithUser(async ({db}: QueryCtx, {post}: {post: Id<"posts">}) => {
  const postDoc = await db.get(post);
  if (!postDoc) {
    return null;
  }
  return await populateFullPost(db, postDoc);
});
