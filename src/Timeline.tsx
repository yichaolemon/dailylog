import { ForwardedRef, forwardRef, useContext, useEffect, useRef, useState } from 'react'
import './App.css'
import React from 'react';
import { useNavigate, useNavigation, useParams } from 'react-router-dom';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated, UsePaginatedQueryResult } from 'convex/react';
import { FullPost } from '../convex/posts';
import { PostEditor } from './PostEditor';
import { User, UserContext } from './App';
import MDEditor from '@uiw/react-md-editor';
import { api } from '../convex/_generated/api';

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
  const deletePost = useMutation(api.posts.deletePost);
  const [deleting, setDeleting] = useState(false);

  return (
  <div
    className="post"
    ref={ref}
    data-color-mode="light"
  >
    {editing ? <PostEditor onDone={() => setEditing(false)} post={post} /> : null }
    <div
      className="post_header"
      onClick={() => navigate('/post/'+post._id.toString())}
    >
      <div className="post_author"><User user={post.author} /></div>
      <div className="post_date">{date.toLocaleTimeString() + " " + date.toLocaleDateString()}</div>
    </div>
    <MDEditor.Markdown
      className="post_text"
      source={post.text}
    />
    {post.images.map(((imageURL, i) => <img className='post_image' key={i} src={imageURL} />))}
    <div className="post_tags">{post.tags.map((tag, i) => <Tag key={i} tag={tag.name} />)}</div>
    <div className="post_footer">
      <div />
      <div>
      {
        userId === post.author._id ? <>
        {deleting ?
        <button className="footer_button" onClick={(event) => {
          setDeleting(false);
        }}>cancel</button>
        :
        <button className="footer_button" onClick={(event) => {
          setEditing(true);
        }}>edit</button>
        }
        <button className="footer_button" onClick={(event) => {
          if (deleting) {
            void deletePost({post: post._id});
          } else {
            setDeleting(true);
          }
        }}>{deleting ? "really delete" : "delete"}</button>
        </> : null
      }
      </div>
    </div>
  </div>
  );
});

export function DailyLogUserTimeline({user}: {user: Id<"users">}) {
  const result = usePaginatedQuery(api.posts.fetchPostsByAuthor, {authorid: user}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogTag({tag}: {tag: string}) {
  const result = usePaginatedQuery(api.posts.fetchPostsByTag, {tag}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogPost({post}: {post: Id<"posts">}) {
  const postDoc = useQuery(api.posts.fetchPost, {post});

  return <DailyLog result={postDoc ?
    {results: [postDoc], isLoading: false, status: 'Exhausted', loadMore: () => {}} :
    {results: [], isLoading: true, status: 'LoadingMore', loadMore: () => {}}
  } />;
}

export function DailyLogFollowing() {
  const result = usePaginatedQuery(api.posts.fetchFollowing, {}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogSearch({search}: {search: string}) {
  const result = usePaginatedQuery(api.posts.searchContent, {search}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogUserSearch({user, search}: {user: Id<"users">, search: string}) {
  const result = usePaginatedQuery(api.posts.searchUserContent, {user, search}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

export function DailyLogTimeline() {
  const result = usePaginatedQuery(api.posts.fetchTimeline, {}, {initialNumItems: 3});
  return <DailyLog result={result} />;
}

function DailyLog({result}: {result: UsePaginatedQueryResult<FullPost>}) {
  const {results: logEntries, status, loadMore} = result;
  const loader = useRef(null);
  // When the third to last post is on screen, load 5 more.
  const loaderIndex = Math.max(0, logEntries.length - 3);
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
  }, [loader, loaderIndex, status]);

  return (<div className="timeline">
      {logEntries.map((post, i) =>
      <LogEntry
        key={post._id.toString()}
        post={post}
        ref={i === loaderIndex ? loader : null}
      />)}
    </div>);
}