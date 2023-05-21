import { useEffect, useState } from 'react'
import './App.css'
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '../convex/_generated/react';
import { Id } from '../convex/_generated/dataModel';
import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, Unauthenticated } from 'convex/react';
import { FullPost } from '../convex/posts';

function PostEditor({onDone}: {onDone: () => void}) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const createPost = useMutation('posts:createPost');
  const handlePost = async () => {
    const tagsArray = tags.split(' ').map((tag) => tag.replaceAll('#', '').replaceAll(',', '')).filter((tag) => tag.length > 0);
    await createPost({text, tags: tagsArray});
    setText('');
    onDone();
  };
  const handleCancel = async () => {
    setText('');
    onDone();
  };
  return (<div className='overlay'>
    <div className='post_edit_area'>
      <textarea className='post_text_edit' placeholder='Text here...' onChange={(event) => setText(event.target.value)} value={text}></textarea>
      <textarea className='post_tags_edit' placeholder='#tags' onChange={(event) => setTags(event.target.value)} value={tags}></textarea>
      <div className='post_footer_edit'>
        <button onClick={handleCancel}>Cancel</button>
        <button onClick={handlePost}>Post</button>
      </div>
    </div>
    </div>);
}

function AddPost() {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <PostEditor onDone={() => setEditing(false)} />;
  } else {
    return (<button className='add_post_button' onClick={() => setEditing(true)}>Add Post</button>);
  }
}

function Tag({tag}: {tag: string}) {
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

function DailyLogUserTimeline({user}: {user: Id<"users">}) {
  const logEntries = useQuery("posts:fetchPostsByAuthor", {authorid: user});
  return <DailyLog logEntries={logEntries} />;
}

function DailyLogTag({tag}: {tag: string}) {
  const logEntries = useQuery("posts:fetchPostsByTag", {tag});
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

function AuthenticatedApp({tag}: {tag: string | undefined}) {
  const storeUser = useMutation('users:storeUser');
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const navigate = useNavigate();
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
        <div className='page_header'>
          <h1><span  onClick={() => navigate('/')}>Daily log</span> {tag ? <Tag tag={tag} /> : null}</h1>
          <div className='page_header_right'>
            <AddPost />
            <UserButton afterSignOutUrl={window.location.href} />
          </div>
        </div>
        {tag ? <DailyLogTag tag={tag} /> : <DailyLogUserTimeline user={userId} />}
    </>
  )
}

function App() {
  const { tag } = useParams();

  return (
    <>
      <Authenticated>
        <AuthenticatedApp tag={tag} />
      </Authenticated>
      <Unauthenticated>
        <SignInButton mode="modal" />
      </Unauthenticated>
    </>
  )
}

export default App
