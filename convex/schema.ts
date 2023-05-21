import { defineSchema, defineTable } from "convex/schema";
import { v } from "convex/values";

export default defineSchema({
    posts: defineTable({
      text: v.string(),
      author: v.id("users"),
      last_updated_date: v.number(),
    }).index("by_author", ["author"]),
    tags: defineTable({
      name: v.string(),
      postid: v.id("posts"),
      post_date: v.number(),
    }).index("by_tag_and_date", ["name", "post_date"])
    .index("by_postid", ["postid"]),
    users: defineTable({
      name: v.string(),
      tokenIdentifier: v.string(),
    }).index("by_token", ["tokenIdentifier"]),
  });