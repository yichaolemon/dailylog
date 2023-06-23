import { useEffect, useState, useContext, createContext } from 'react'
import './App.css'
import React from 'react';
import { api } from '../convex/_generated/api';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Doc, Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated } from 'convex/react';
import { FullPost } from '../convex/posts';
import { AddPost } from './PostEditor';
import { DailyLogFollowing, DailyLogPost, DailyLogSearch, DailyLogTag, DailyLogTimeline, DailyLogUserSearch, DailyLogUserTimeline, Tag } from './Timeline';
import { FullUser } from '../convex/users';

export const UserContext = createContext<Id<"users"> | null>(null);

function UserById({user}: {user: Id<"users">}) {
  const userDoc = useQuery(api.users.getUser, {user});
  if (!userDoc) {
    return null;
  }

  return <User user={userDoc} />;
}

export function User({user}: {user: FullUser}) {
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
  const user = userId! as Id<"users">;
  const userDoc = useQuery(api.users.getUser, {user});
  const follow = useMutation(api.users.follow);
  const unfollow = useMutation(api.users.unfollow);
  if (!userDoc) {
    return null;
  }
  if (userDoc.isMe) {
    return null;
  }
  if (userDoc.followed) {
    return <button onClick={() => unfollow({user})}>Unfollow</button>;
  } else if (userDoc.followRequested) {
    return <button onClick={() => unfollow({user})}>Cancel follow request</button>;
  } else {
    return <button onClick={() => follow({user})}>Follow</button>;
  }
}

export function FollowsMeButton() {
  const { user: userId } = useParams();
  const user = userId! as Id<"users">;
  const userDoc = useQuery(api.users.getUser, {user});
  const accept = useMutation(api.users.acceptFollow);
  const reject = useMutation(api.users.rejectFollow);
  if (!userDoc) {
    return null;
  }
  if (userDoc.isMe) {
    return null;
  }
  if (userDoc.followsMe) {
    return <button onClick={() => reject({user})}>Reject follower</button>;
  } else if (userDoc.followsMeRequested) {
    return <button onClick={() => accept({user})}>Accept follow request</button>;
  } else {
    return null;
  }
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
    {user ? <UserById user={user as Id<"users">} /> : null}
    </h1>
    <div className='page_header_right'>
      {user ? <FollowsMeButton /> : null}
      {user ? <FollowButton /> : null}
      {following || tag || post ? null : <Search />}
      <AddPost />
      <UserButton afterSignOutUrl={window.location.href} />
    </div>
  </div>;
}

function NavigationSidebar({user}: {user: Id<"users">}) {
  const navigate = useNavigate();

  const allUsers = useQuery(api.users.allUsers);

  return <div className='navigation_bar'>
    <div className='navigation_bar_item button' onClick={() => navigate('/')}>
      Timeline
    </div>
    <div className='navigation_bar_item button' onClick={() => navigate('/following')}>
      Following
    </div>
    <div className='navigation_bar_item button' onClick={() => navigate('/user/' + user.toString())}>
      My Log
    </div>
    <div className='navigation_bar_item button' onClick={() => navigate('/goals')}>
      Goals
    </div>
    <div>
      users
      {allUsers?.map((user) => {
        return <div key={user._id.toString()}><User user={user} /></div>;
      })}
    </div>
  </div>;
}

function AuthenticatedApp({following}: {following?: boolean}) {
  const { tag, user: selectedUser, post } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("s");

  const storeUser = useMutation(api.users.storeUser);
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
  const selectedUserId = selectedUser ? selectedUser as Id<"users"> : null;

  return (
    <UserContext.Provider value={userId}>
      <PageHeader following={following} />
      <div className='page_body'>
        <NavigationSidebar user={userId} />
        {tag ? <DailyLogTag tag={tag} /> :
        post ? <DailyLogPost post={post as Id<"posts">} /> :
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
