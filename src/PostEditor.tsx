import { useRef, useState } from "react";
import React from 'react';
import { useMutation, usePaginatedQuery, useQuery } from '../convex/_generated/react';
import { Doc, Id } from "../convex/_generated/dataModel";
import { FullPost } from "../convex/posts";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';

export function PostEditor({onDone, post}: {onDone: () => void, post?: FullPost}) {
  const [text, setText] = useState(post ? post.text : '');
  const [tags, setTags] = useState(post ? post.tags.map((t) => `#${t.name}`).join(' ') : '');
  const [posting, setPosting] = useState(false);
  const createPost = useMutation('posts:createPost');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileRef = useRef<null | HTMLInputElement>(null);
  const newImageURL = useMutation('posts:newImageURL');
  const [datetime, setDatetime] = React.useState<Dayjs | null>(dayjs(post?.last_updated_date));

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
    await createPost({
      postId: post?._id,
      text,
      tags: tagsArray,
      images,
      lastUpdatedDate: datetime ? datetime.valueOf() : post?.last_updated_date,
    });
    
    setSelectedImage(null);
    setText('');
    fileRef.current!.value = "";
    onDone();
  };
  const handleCancel = async () => {
    setText('');
    onDone();
  };
  return (<div className='overlay' onClick={(event) => event.stopPropagation()}>
    <div className='post_edit_area'>
      <textarea className='post_text_edit' placeholder='Text here...' onChange={(event) => setText(event.target.value)} value={text}></textarea>
      <textarea className='post_tags_edit' placeholder='#tags' onChange={(event) => setTags(event.target.value)} value={tags}></textarea>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateTimePicker
          value={datetime}
          onChange={(newValue) => setDatetime(newValue)}
        />
      </LocalizationProvider>
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
