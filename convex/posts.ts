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

const populateFullPosts = async (db: DatabaseReader, posts: Doc<'posts'>[]) => {
  const fullPosts: FullPost[] = [];
  for (const post of posts) {
    const author = (await db.get(post.author))!;
    const tags = await db.query("tags").withIndex("by_postid", q => q.eq('postid', post._id)).collect();
    fullPosts.push({...post, author, tags});
  }
  return fullPosts;
};

export const fetchPostsByAuthor = queryWithUser(async ({db}: QueryCtx, {authorid}: {authorid: Id<'users'>}) => {
  const posts = await db.query("posts")
    .withIndex("by_author", q => 
    q.eq("author", authorid)
    )
    .order("desc")
    .collect();
  return await populateFullPosts(db, posts);
});

export const fetchPostsByTag = queryWithUser(async ({db}: QueryCtx, {tag}: {tag: string}) => {
  const tags = await db.query("tags").withIndex("by_tag_and_date", q => q.eq('name', tag)).order('desc').collect();
  const posts = await Promise.all(tags.map(async (tag) => {
    return (await db.get(tag.postid))!;
  }));
  return await populateFullPosts(db, posts);
});
