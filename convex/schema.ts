import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  posts: defineTable({
    text: v.string(),
    author: v.id("users"),
    images: v.optional(v.array(v.string())),
    last_updated_date: v.number(),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  })
    .index("by_author", ["author", "last_updated_date"])
    .index("by_date", ["last_updated_date"])
    .index("by_author_status", ["author", "status"])
    .searchIndex("by_text", { filterFields: ["author"], searchField: "text" }),
  tags: defineTable({
    name: v.string(),
    postid: v.id("posts"),
    post_date: v.number(),
  })
    .index("by_tag_and_date", ["name", "post_date"])
    .index("by_postid", ["postid"]),
  follows: defineTable({
    follower: v.id("users"),
    followed: v.id("users"),
    accepted: v.optional(v.boolean()),
  }).index("by_follower", ["follower", "followed"]),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
  goals: defineTable({
    name: v.string(),
    description: v.string(),
    tag: v.string(),
  }),
});
