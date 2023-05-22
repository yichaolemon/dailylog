import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { BrowserRouter as Router, Routes, Route, createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorPage from './error-page.js';


const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/tag/:tag",
    element: <App />,
  },
  {
    path: "/user/:user",
    element: <App />,
  },
  {
    path: "/post/:post",
    element: <App />,
  },
  {
    path: "/following",
    element: <App following={true} />
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
    >
      <ConvexProviderWithClerk client={convex}>
        <RouterProvider router={router} />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
)
