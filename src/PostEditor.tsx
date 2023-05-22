import { useState } from "react";
import React from 'react';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';

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

export function AddPost() {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <PostEditor onDone={() => setEditing(false)} />;
  } else {
    return (<button className='add_post_button' onClick={() => setEditing(true)}>Add Post</button>);
  }
}
