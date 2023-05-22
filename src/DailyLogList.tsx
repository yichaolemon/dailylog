import { useEffect, useState } from 'react'
import './App.css'
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';
import { Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated } from 'convex/react';
import { FullPost } from '../convex/posts';
import { AddPost } from './PostEditor';

export function Tag({tag}: {tag: string}) {
  const navigate = useNavigate();

  return <span
    className='tag'
    onClick={() => navigate('/tag/'+tag)
  }>&#35;{tag} </span>;
}

function LogEntry({text, author, creationTime, tags}: {text: string, author: string, creationTime: number, tags: string[]}) {
  const date = new Date(creationTime);
  return (
  <div className="post">
    <div className="post_header">
      <div className="post_author">{author}</div>
      <div className="post_date">{date.toLocaleTimeString() + " " + date.toLocaleDateString()}</div>
    </div>
    <div className="post_text">{text}</div>
    <div className="post_tags">{tags.map((tag, i) => <Tag key={i} tag={tag} />)}</div>
  </div>
  );
}

export function DailyLogUserTimeline({user}: {user: Id<"users">}) {
  const {results: logEntries, status, loadMore} = usePaginatedQuery("posts:fetchPostsByAuthor", {authorid: user}, {initialNumItems: 3});
  return <DailyLog logEntries={logEntries} />;
}

export function DailyLogTag({tag}: {tag: string}) {
  const {results: logEntries, status, loadMore} = usePaginatedQuery("posts:fetchPostsByTag", {tag}, {initialNumItems: 3});
  return <DailyLog logEntries={logEntries} />;
}

function DailyLog({logEntries}: {logEntries: FullPost[] | undefined}) {
  if (!logEntries) {
    return null;
  }

  return (<div className="timeline">
      {logEntries.map(({_id, text, author, _creationTime, tags}) =>
      <LogEntry
        key={_id.toString()}
        text={text} 
        creationTime={_creationTime} 
        author={author.name} 
        tags={tags.map((tag) => tag.name)}
      />)}
    </div>);
}