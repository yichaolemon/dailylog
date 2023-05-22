import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.jsx'
import { ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


export default function HomePage() {
  return <App />; 
}