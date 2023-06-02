import { useEffect, useState, useContext, createContext } from 'react'
import './App.css'
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';
import { Doc, Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated } from 'convex/react';
import { FullPost } from '../convex/posts';
import { AddPost } from './PostEditor';
import { DailyLogFollowing, DailyLogPost, DailyLogSearch, DailyLogTag, DailyLogTimeline, DailyLogUserSearch, DailyLogUserTimeline, Tag } from './Timeline';

export const UserContext = createContext<Id<"users"> | null>(null);

function UserById({user}: {user: Id<"users">}) {
  const userDoc = useQuery("users:getUser", {user});
  if (!userDoc) {
    return null;
  }

  return <User user={userDoc} />;
}

export function User({user}: {user: Doc<"users">}) {
  const navigate = useNavigate();
  return <span className='username' onClick={(event) => {
    event.stopPropagation();
    navigate('/user/'+user._id.toString());
  }}>
    &#64;{user.name}
  </span>;
}

export function FollowButton() {
  const { user: userId } = useParams();
  const user = new Id("users", userId!);
  const userDoc = useQuery("users:getUser", {user});
  const follow = useMutation("users:follow");
  const unfollow = useMutation("users:unfollow");
  if (!userDoc) {
    return null;
  }
  if (userDoc.isMe) {
    return null;
  }
  if (userDoc.followed) {
    return <button onClick={() => unfollow({user})}>Unfollow</button>;
  }
  return <button onClick={() => follow({user})}>Follow</button>;
}

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  return <input type="text" placeholder="search" value={searchParams.get("s") ?? ""} onChange={(event) => {
    setSearchParams({s: event.target.value});
  }} />;
}

function PageHeader({following}: {following?: boolean}) {
  const { tag, user, post } = useParams();
  const navigate = useNavigate();

  return <div className='page_header'>
    <h1><span onClick={() => navigate('/')}>Daily log </span>
    {tag ? <Tag tag={tag} /> : null}
    {user ? <UserById user={new Id("users", user)} /> : null}
    </h1>
    <div className='page_header_right'>
      {user ? <FollowButton /> : null}
      {following || tag || post ? null : <Search />}
      <AddPost />
      <UserButton afterSignOutUrl={window.location.href} />
    </div>
  </div>;
}

function NavigationSidebar({user}: {user: Id<"users">}) {
  const navigate = useNavigate();

  return <div className='navigation_bar'>
    <div className='navigation_bar_item' onClick={() => navigate('/')}>
      Timeline
    </div>
    <div className='navigation_bar_item' onClick={() => navigate('/following')}>
      Following
    </div>
    <div className='navigation_bar_item' onClick={() => navigate('/user/' + user.toString())}>
      My Log
    </div>
  </div>;
}

function AuthenticatedApp({following}: {following?: boolean}) {
  const { tag, user: selectedUser, post } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("s");

  const storeUser = useMutation('users:storeUser');
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  useEffect(() => {
    async function createUser() {
      setUserId(await storeUser());
    }
    createUser();
  }, [storeUser]);
  if (!userId) {
    return null;
  }
  const selectedUserId = selectedUser ? new Id("users", selectedUser) : null;

  return (
    <UserContext.Provider value={userId}>
      <PageHeader following={following} />
      <div className='page_body'>
        <NavigationSidebar user={userId} />
        {tag ? <DailyLogTag tag={tag} /> :
        post ? <DailyLogPost post={new Id("posts", post)} /> :
        following ? <DailyLogFollowing /> :
        (selectedUserId && searchQuery) ? <DailyLogUserSearch user={selectedUserId} search={searchQuery} /> :
        selectedUserId ? <DailyLogUserTimeline user={selectedUserId} /> :
        searchQuery ? <DailyLogSearch search={searchQuery} /> :
        <DailyLogTimeline />}
      </div>
    </UserContext.Provider>
  )
}

function App({following}: {following?: boolean}) {
  return (
    <>
      <Authenticated>
        <AuthenticatedApp following={following} />
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="modal" />
      </Unauthenticated>
    </>
  )
}

export default App
