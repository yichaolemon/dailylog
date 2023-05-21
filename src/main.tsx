import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tag/:tag" element={<App />} />
      </Routes>
    </Router>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
    >
      <ConvexProviderWithClerk client={convex}>
        <AppRouter />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
)
