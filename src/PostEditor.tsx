import { useRef, useState } from "react";
import React from 'react';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';

function PostEditor({onDone}: {onDone: () => void}) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [posting, setPosting] = useState(false);
  const createPost = useMutation('posts:createPost');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileRef = useRef<null | HTMLInputElement>(null);
  const newImageURL = useMutation('posts:newImageURL');

  const handlePost = async () => {
    setPosting(true);
    const tagsArray = tags.split(' ').map((tag) => tag.replaceAll('#', '').replaceAll(',', '')).filter((tag) => tag.length > 0);
    const images = [];
    if (selectedImage) {
      const imageURL = await newImageURL();
      const result = await fetch(imageURL, {
        method: "POST",
        headers: { "Content-Type": selectedImage!.type },
        body: selectedImage,
      });
      const { storageId } = await result.json();
      images.push(storageId);
    }
    await createPost({text, tags: tagsArray, images});
    
    setSelectedImage(null);
    setText('');
    fileRef.current!.value = "";
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
        <div>
        <input
          type="file"
          accept="image/*"
          id="upload-button"
          ref={fileRef}
          onChange={(event) => {
            setSelectedImage(event.target.files ? event.target.files![0] : null);
          }}
        />
        </div>
        <button onClick={handlePost} disabled={posting}>Post</button>
      </div>
    </div>
    </div>);
}

export function AddPost() {
  const [editing, setEditing] = useState(false);

  return <>
    <button className='add_post_button' onClick={() => setEditing(true)}>Add Post</button>
    {editing ? <PostEditor onDone={() => setEditing(false)} /> : null}
  </>;
}
