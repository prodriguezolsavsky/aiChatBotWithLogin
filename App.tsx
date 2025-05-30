
import React, { useState, useEffect, useCallback } from 'react';
import { LoginPage } from './components/LoginPage';
import { ChatPage } from './components/ChatPage';
import { MessageSender, ChatMessageData } from './types'; // Ensure ChatMessageData is imported if used for error messages

// IMPORTANT: The Google Client ID is hardcoded below for immediate testing.
// For production, it's STRONGLY recommended to configure this via an environment variable.
// To do that, you would set REACT_APP_GOOGLE_CLIENT_ID in your environment
// and change the line below back to:
// const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID = "238985314891-5478a2ao2o1itasgv13lo301svjfqnrd.apps.googleusercontent.com"; // Your provided Client ID

const GOOGLE_SIGN_IN_BUTTON_ID = 'google-signin-button-div-loginpage'; // Unique ID for the button container

interface UserInfo {
  id: string; // Made id non-optional as it's crucial
  name?: string;
  email?: string;
  picture?: string;
}

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [isClientIDConfigured, setIsClientIDConfigured] = useState(true);
  const [gsiError, setGsiError] = useState<string | null>(null);

  const createErrorMessage = (text: string): ChatMessageData => ({
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    text,
    sender: MessageSender.ERROR,
    timestamp: new Date(),
  });

  // Check GSI script readiness
  useEffect(() => {
    const intervalId = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        setGsiLoaded(true);
        clearInterval(intervalId);
      }
    }, 100);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (!(window as any).google?.accounts?.id) {
        console.error("Google Identity Services script did not load in time.");
        setGsiError("Google Sign-In services are currently unavailable. Please try refreshing.");
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Initialize GSI and check Client ID
  useEffect(() => {
    if (gsiLoaded) {
      if (!GOOGLE_CLIENT_ID) { 
        console.error("Google Client ID is not configured. Ensure REACT_APP_GOOGLE_CLIENT_ID environment variable is set correctly or hardcoded value is present.");
        setGsiError("Google Sign-In is not configured. Please ensure the Client ID is set by the site administrator.");
        setIsClientIDConfigured(false);
        return;
      }
      setIsClientIDConfigured(true);
      setGsiError(null); // Clear previous errors if any

      try {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleLoginResponse,
          auto_select: false, 
        });
      } catch (error) {
        console.error("Error initializing Google Sign-In:", error);
        setGsiError("Could not initialize Google Sign-In. Please try again later.");
      }
    }
  }, [gsiLoaded]); 

  const handleGoogleLoginResponse = useCallback((response: any /* google.accounts.id.CredentialResponse */) => {
    try {
      const idToken = response.credential;
      const decodedToken: any = JSON.parse(atob(idToken.split('.')[1]));
      
      if (!decodedToken.sub) {
        console.error("Google ID token sub (user ID) is missing.");
        setGsiError("Failed to retrieve user ID from Google. Please try again.");
        return;
      }
      
      setUserInfo({
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture,
      });
      setGsiError(null); 
    } catch (error) {
      console.error("Error decoding Google ID token:", error);
      setGsiError("Failed to process Google login. Please try again.");
    }
  }, []);

  const handleLogout = useCallback(() => {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    setUserInfo(null);
  }, []);

  // Render GSI Button on Login Page
  useEffect(() => {
    if (gsiLoaded && isClientIDConfigured && !userInfo) { 
      const buttonContainer = document.getElementById(GOOGLE_SIGN_IN_BUTTON_ID);
      if (buttonContainer) {
        try {
            buttonContainer.innerHTML = ''; 
            (window as any).google.accounts.id.renderButton(
              buttonContainer,
              { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', shape: 'rectangular' }
            );
        } catch (error) {
            console.error("Error rendering Google Sign-In button:", error);
            setGsiError("Could not display Google Sign-In button. Please refresh.");
        }
      }
    } else if (gsiLoaded && userInfo) { 
        const buttonContainer = document.getElementById(GOOGLE_SIGN_IN_BUTTON_ID);
        if (buttonContainer) {
            buttonContainer.innerHTML = '';
        }
    }
  }, [gsiLoaded, isClientIDConfigured, userInfo]);


  if (!userInfo) {
    return (
      <LoginPage
        gsiLoaded={gsiLoaded}
        isClientIDConfigured={isClientIDConfigured}
        googleSignInButtonId={GOOGLE_SIGN_IN_BUTTON_ID}
        gsiError={gsiError}
      />
    );
  }

  return <ChatPage userInfo={userInfo} onLogout={handleLogout} />;
};

export default App;
