import { ForwardedRef, forwardRef, useContext, useEffect, useRef, useState } from 'react'
import './App.css'
import React from 'react';
import { useNavigate, useNavigation, useParams } from 'react-router-dom';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';
import { Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, UsePaginatedQueryResult } from 'convex/react';
import { FullPost } from '../convex/posts';
import { PostEditor } from './PostEditor';
import { User, UserContext } from './App';

export function Tag({tag}: {tag: string}) {
  const navigate = useNavigate();

  return <span
    className='tag button'
    onClick={(event) => {
      event.stopPropagation();
      navigate('/tag/'+tag);
    }
  }>&#35;{tag} </span>;
}

const LogEntry = forwardRef(({post}: {post: FullPost}, ref: ForwardedRef<HTMLDivElement>) => {
  const date = new Date(post.last_updated_date);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const userId = useContext(UserContext)!;

  return (
  <div className="post" onClick={() => navigate('/post/'+post._id.toString())} ref={ref}>
    {editing ? <PostEditor onDone={() => setEditing(false)} post={post} /> : null }
    <div className="post_header">
      <div className="post_author"><User user={post.author} /></div>
      <div className="post_date">{date.toLocaleTimeString() + " " + date.toLocaleDateString()}</div>
    </div>
    <div className="post_text">{post.text}</div>
    {post.images.map(((imageURL, i) => <img className='post_image' key={i} src={imageURL} />))}
    <div className="post_tags">{post.tags.map((tag, i) => <Tag key={i} tag={tag.name} />)}</div>
    <div className="post_footer">
      <div />
      {
        userId.equals(post.author._id) ? <button className="edit_button" onClick={(event) => {
          event.stopPropagation();
          setEditing(true);
        }}>edit</button> : null
      }
    </div>
  </div>
  );
});

export function DailyLogUserTimeline({user}: {user: Id<"users">}) {
  const result = usePaginatedQuery("posts:fetchPostsByAuthor", {authorid: user}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogTag({tag}: {tag: string}) {
  const result = usePaginatedQuery("posts:fetchPostsByTag", {tag}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogPost({post}: {post: Id<"posts">}) {
  const postDoc = useQuery("posts:fetchPost", {post});

  return <DailyLog result={postDoc ?
    {results: [postDoc], status: 'Exhausted', loadMore: undefined} :
    {results: [], status: 'LoadingMore', loadMore: undefined}
  } />;
}

export function DailyLogFollowing() {
  const result = usePaginatedQuery("posts:fetchFollowing", {}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogSearch({search}: {search: string}) {
  const result = usePaginatedQuery("posts:searchContent", {search}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogUserSearch({user, search}: {user: Id<"users">, search: string}) {
  const result = usePaginatedQuery("posts:searchUserContent", {user, search}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogTimeline() {
  const result = usePaginatedQuery("posts:fetchTimeline", {}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

function DailyLog({result}: {result: UsePaginatedQueryResult<FullPost>}) {
  const {results: logEntries, status, loadMore} = result;
  const loader = useRef(null);
  // When the third to last post is on screen, load 5 more.
  const loaderIndex = logEntries.length - 3;
  const handleObserver = (entries: any) => {
    const target = entries[0];
    if (target.isIntersecting && status === 'CanLoadMore') {
      loadMore(5);
    }
  };
  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver);
    if (loader.current) {
      observer.observe(loader.current);
    }
    return () => observer.disconnect();
  }, [loader, loaderIndex]);

  return (<div className="timeline">
      {logEntries.map((post, i) =>
      <LogEntry
        key={post._id.toString()}
        post={post}
        ref={i === loaderIndex ? loader : null}
      />)}
    </div>);
}