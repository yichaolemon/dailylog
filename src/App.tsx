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
import { DailyLogTag, DailyLogUserTimeline, Tag } from './DailyLogList';

function PageHeader() {
  const { tag } = useParams();
  const navigate = useNavigate();

  return <div className='page_header'>
    <h1><span onClick={() => navigate('/')}>Daily log</span> {tag ? <Tag tag={tag} /> : null}</h1>
    <div className='page_header_right'>
      <AddPost />
      <UserButton afterSignOutUrl={window.location.href} />
    </div>
  </div>;
}


function AuthenticatedApp() {
  const { tag } = useParams();

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
  return (
    <>
      <PageHeader />
      {tag ? <DailyLogTag tag={tag} /> : <DailyLogUserTimeline user={userId} />}
    </>
  )
}

function App() {
  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="modal" />
      </Unauthenticated>
    </>
  )
}

export default App
