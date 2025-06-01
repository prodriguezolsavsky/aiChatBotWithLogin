
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LoginPage } from './components/LoginPage';
import { ChatPage } from './components/ChatPage';
import { Sidebar } from './components/Sidebar'; // New component
import { MessageSender, ChatMessageData, ChatSession } from './types';

const GOOGLE_CLIENT_ID = "238985314891-k2dfuepsjfosvtc7gpq7v3n97ftu3flg.apps.googleusercontent.com";
const GOOGLE_SIGN_IN_BUTTON_ID = 'google-signin-button-div-loginpage';

interface UserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

const createWelcomeMessage = (userName?: string): ChatMessageData => ({
  id: Date.now().toString(36) + Math.random().toString(36).substring(2),
  text: `Hello, ${userName || 'User'}! How can I help you today?`,
  sender: MessageSender.BOT,
  timestamp: new Date(),
});

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [isClientIDConfigured, setIsClientIDConfigured] = useState(true);
  const [gsiError, setGsiError] = useState<string | null>(null);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const initialChatCreationAttemptedForSession = useRef(false);


  // GSI Script Readiness
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
    return () => { clearInterval(intervalId); clearTimeout(timeoutId); };
  }, []);

  // Initialize GSI
  useEffect(() => {
    if (gsiLoaded) {
      if (!GOOGLE_CLIENT_ID) {
        console.error("Google Client ID is not configured.");
        setGsiError("Google Sign-In is not configured. Please ensure the Client ID is set by the site administrator.");
        setIsClientIDConfigured(false);
        return;
      }
      setIsClientIDConfigured(true);
      setGsiError(null);
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

  // Effect to reset initial chat creation attempt flag when user logs in/out
  useEffect(() => {
    if (userInfo) {
      // User has logged in
      initialChatCreationAttemptedForSession.current = false;
    }
  }, [userInfo]);

  const loadUserSessions = useCallback((userId: string) => {
    const sessionsKey = `chatSessions_user_${userId}`;
    const storedSessions = localStorage.getItem(sessionsKey);
    if (storedSessions) {
      try {
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions);
        setChatSessions(parsedSessions);
        if (parsedSessions.length > 0) {
          const sortedSessions = [...parsedSessions].sort((a, b) => b.lastUpdated - a.lastUpdated);
          setCurrentChatId(sortedSessions[0].id);
        } else {
          setCurrentChatId(null); 
        }
      } catch (e) {
        console.error(`Failed to parse chat sessions from localStorage for user ${userId}:`, e);
        setChatSessions([]);
        setCurrentChatId(null);
      }
    } else {
      setChatSessions([]);
      setCurrentChatId(null); 
    }
  }, [setChatSessions, setCurrentChatId]);


  const handleGoogleLoginResponse = useCallback((response: any) => {
    try {
      const idToken = response.credential;
      const decodedToken: any = JSON.parse(atob(idToken.split('.')[1]));
      if (!decodedToken.sub) {
        console.error("Google ID token sub (user ID) is missing.");
        setGsiError("Failed to retrieve user ID from Google. Please try again.");
        return;
      }
      const loggedInUserInfo: UserInfo = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture,
      };
      setUserInfo(loggedInUserInfo);
      setGsiError(null);
      loadUserSessions(loggedInUserInfo.id);
    } catch (error) {
      console.error("Error decoding Google ID token:", error);
      setGsiError("Failed to process Google login. Please try again.");
    }
  }, [loadUserSessions, setUserInfo, setGsiError]);
  

  const handleLogout = useCallback(() => {
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    setUserInfo(null);
    setChatSessions([]);
    setCurrentChatId(null);
  }, [setUserInfo, setChatSessions, setCurrentChatId]);

  // Save chat sessions to localStorage when they change
  useEffect(() => {
    if (userInfo && chatSessions) {
      const sessionsKey = `chatSessions_user_${userInfo.id}`;
      try {
        localStorage.setItem(sessionsKey, JSON.stringify(chatSessions));
      } catch (error) {
        console.error(`Failed to save chat sessions to localStorage for user ${userInfo.id}:`, error);
      }
    }
  }, [chatSessions, userInfo]);

  const handleNewChat = useCallback(() => {
    if (!userInfo) return;
    const newChatId = `chat_${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
    const newSession: ChatSession = {
      id: newChatId,
      title: "New Chat", 
      lastUpdated: Date.now(),
    };
    
    const welcomeMessage = createWelcomeMessage(userInfo.name);
    try {
      // Ensure timestamp is ISO string for JSON compatibility, though JSON.stringify does this for Date objects.
      localStorage.setItem(`chatMessages_${newChatId}`, JSON.stringify([welcomeMessage]));
    } catch (error) {
        console.error(`Failed to save welcome message to localStorage for new chat ${newChatId}:`, error);
    }
    
    setChatSessions(prevSessions => [newSession, ...prevSessions].sort((a,b) => b.lastUpdated - a.lastUpdated));
    setCurrentChatId(newChatId);
  }, [userInfo, setChatSessions, setCurrentChatId]);

  // Effect to automatically create a new chat if user logs in and has no chats
  useEffect(() => {
    if (userInfo && currentChatId === null && chatSessions.length === 0 && !initialChatCreationAttemptedForSession.current) {
      handleNewChat();
      initialChatCreationAttemptedForSession.current = true;
    }
  }, [userInfo, currentChatId, chatSessions, handleNewChat]);


  const handleSelectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, [setCurrentChatId]);
  
  const handleDeleteChat = useCallback((chatIdToDelete: string) => {
    if (!userInfo) return;

    const updatedSessions = chatSessions.filter(session => session.id !== chatIdToDelete);
    setChatSessions(updatedSessions);
    
    try {
      localStorage.removeItem(`chatMessages_${chatIdToDelete}`);
    } catch (error) {
      console.error(`Failed to remove chat messages from localStorage for chat ${chatIdToDelete}:`, error);
    }

    if (currentChatId === chatIdToDelete) {
      if (updatedSessions.length > 0) {
        const sortedRemaining = [...updatedSessions].sort((a,b) => b.lastUpdated - a.lastUpdated);
        setCurrentChatId(sortedRemaining[0].id);
      } else {
        setCurrentChatId(null);
      }
    }
  }, [currentChatId, chatSessions, userInfo, setChatSessions, setCurrentChatId]);

  const handleMessagesUpdate = useCallback((chatId: string, messages: ChatMessageData[]) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session => {
        if (session.id === chatId) {
          let newTitle = session.title;
          const firstUserMessage = messages.find(m => m.sender === MessageSender.USER);
          if (firstUserMessage && (session.title === "New Chat" || !session.firstUserMessageSnippet || session.firstUserMessageSnippet !== firstUserMessage.text.substring(0,30))) {
              newTitle = firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? "..." : "");
          }
          
          return { 
            ...session, 
            title: newTitle, 
            lastUpdated: Date.now(),
            firstUserMessageSnippet: firstUserMessage ? firstUserMessage.text.substring(0,30) : session.firstUserMessageSnippet
          };
        }
        return session;
      }).sort((a,b) => b.lastUpdated - a.lastUpdated)
    );
  }, [setChatSessions]);

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
      if (buttonContainer) buttonContainer.innerHTML = '';
    }
  }, [gsiLoaded, isClientIDConfigured, userInfo, gsiError]); // Added gsiError to dependencies

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

  return (
    <div className="flex h-screen bg-gray-900 text-white antialiased">
      <Sidebar
        userInfo={userInfo}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentChatId ? (
          <ChatPage
            key={currentChatId} 
            userInfo={userInfo} 
            chatId={currentChatId}
            onLogout={handleLogout} 
            onMessagesUpdate={handleMessagesUpdate}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-blue-500 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.86 8.25-8.625 8.25S3.75 16.556 3.75 12C3.75 7.444 7.365 3.75 12 3.75c4.701 0 8.303 3.348 8.605 7.645a.75.75 0 0 0 .595.805 60.618 60.618 0 0 1 .37 5.363Z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-200 mb-2">AI Chat Assistant</h2>
            <p className="text-gray-400 mb-6">Select a chat from the sidebar or start a new conversation.</p>
            <button
              onClick={handleNewChat}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 inline">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Start New Chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
