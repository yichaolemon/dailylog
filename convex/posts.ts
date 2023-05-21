import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
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

type FullPost = Omit<Doc<'posts'>, 'author'> & {author: Doc<'users'>, tags: Doc<'tags'>[]};

export const fetchPostsByAuthor = queryWithUser(async ({db}, {authorid}: {authorid: Id<'users'>}) => {
  const posts = await db.query("posts")
    .withIndex("by_author", q => 
    q.eq("author", authorid)
    )
    .order("desc")
    .collect();
  const fullPosts: FullPost[] = [];
  for (const post of posts) {
    const author = (await db.get(post.author))!;
    const tags = await db.query("tags").withIndex("by_postid", q => q.eq('postid', post._id)).collect();
    fullPosts.push({...post, author, tags});
  }
  return fullPosts;
});
