import React, { useEffect, useState } from "react";
import { auth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "./firebase";
import QuizbowlApp from "./QuizbowlApp";

function getInitialAuthToken() {
  if (typeof window !== 'undefined' && window.__initial_auth_token) {
    return window.__initial_auth_token;
  }
  return null;
}

function getAppId() {
  if (typeof window !== 'undefined' && window.__app_id) {
    return window.__app_id;
  }
  return 'default-quizbowl-app';
}

export default function App() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appId, setAppId] = useState(getAppId());

  useEffect(() => {
    let unsub;
    setLoading(true);
    setAuthError(null);
    const token = getInitialAuthToken();
    if (token) {
      signInWithCustomToken(auth, token)
        .catch(e => {
          setAuthError('Custom token sign-in failed: ' + (e.message || e.code));
          setLoading(false);
        });
    } else {
      signInAnonymously(auth)
        .catch(e => {
          setAuthError('Anonymous sign-in failed: ' + (e.message || e.code));
          setLoading(false);
        });
    }
    unsub = onAuthStateChanged(auth, user => {
      if (user) {
        setUserId(user.uid);
        setLoading(false);
      } else {
        setUserId(null);
        setLoading(false);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <span className="ml-4 text-gray-300 text-lg">Authenticating...</span>
      </div>
    );
  }
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <div className="text-red-400 text-lg font-semibold mb-2">{authError}</div>
        <button
          className="mt-2 px-4 py-2 bg-blue-600 rounded text-white font-semibold hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >Retry</button>
      </div>
    );
  }
  return <QuizbowlApp userId={userId} appId={appId} />;
}
