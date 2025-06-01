
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessageData, MessageSender } from '../types';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { getN8nChatResponse } from '../services/n8nService';

const TYPING_INDICATOR_ID = 'typing-indicator-message';

interface UserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface ChatPageProps {
  userInfo: UserInfo;
  chatId: string;
  onLogout: () => void;
  onMessagesUpdate: (chatId: string, messages: ChatMessageData[]) => void;
}

// --- SVG Icons ---
const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
  </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
  </svg>
);

const DefaultAvatarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-8 h-8"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);
// --- End SVG Icons ---

const createMessage = (text: string, sender: MessageSender): ChatMessageData => ({
  id: Date.now().toString(36) + Math.random().toString(36).substring(2),
  text,
  sender,
  timestamp: new Date(),
});

export const ChatPage: React.FC<ChatPageProps> = ({ userInfo, chatId, onLogout, onMessagesUpdate }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessagesKey = `chatMessages_${chatId}`;
    const storedMessages = localStorage.getItem(storedMessagesKey);
    if (storedMessages) {
      try {
        const parsedMessages: ChatMessageData[] = JSON.parse(storedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp) // Convert ISO string back to Date object
        }));
        setMessages(parsedMessages);
      } catch (e) {
        console.error(`Failed to parse stored messages for chat ${chatId}:`, e);
        setMessages([]); // Fallback to empty if parsing fails
      }
    } else {
      // No stored messages for this chat ID, could be a new chat.
      // App.tsx's handleNewChat is responsible for seeding the welcome message.
      setMessages([]);
    }
    setIsLoading(false);
    setIsUserMenuOpen(false); 
  }, [chatId]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (chatId && messages) { // Ensure chatId is present and messages array exists (even if empty)
      const storedMessagesKey = `chatMessages_${chatId}`;
      try {
        localStorage.setItem(storedMessagesKey, JSON.stringify(messages.map(msg => ({
          ...msg,
          // Ensure timestamp is ISO string for JSON storage
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
        }))));
      } catch (error) {
        console.error(`Failed to save messages for chat ${chatId} to localStorage:`, error);
      }
      // Notify App component about message updates for session management (e.g., title, lastUpdated)
      // This should be called regardless of localStorage success if messages array has changed.
      onMessagesUpdate(chatId, messages);
    }
  }, [messages, chatId, onMessagesUpdate]);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const addMessageToList = useCallback((newMessage: ChatMessageData) => {
    setMessages(prevMessages => [...prevMessages.filter(m => m.id !== TYPING_INDICATOR_ID), newMessage]);
  }, []);

  const showTypingIndicator = useCallback(() => {
    setMessages(prev => {
      if (prev.find(m => m.id === TYPING_INDICATOR_ID)) return prev;
      const newTypingMessage = createMessage('Bot is typing...', MessageSender.TYPING_INDICATOR);
      newTypingMessage.id = TYPING_INDICATOR_ID;
      return [...prev, newTypingMessage];
    });
  }, []);

  const removeTypingIndicator = useCallback(() => {
    setMessages(prev => prev.filter(m => m.id !== TYPING_INDICATOR_ID));
  }, []);

  const handleSendMessage = useCallback(async (userMessageText: string) => {
    if (!chatId) {
      console.error("Chat ID not available. Cannot send message.");
      addMessageToList(createMessage("Error: Chat ID is missing. Please try selecting a chat again.", MessageSender.ERROR));
      return;
    }
    
    const userMessage = createMessage(userMessageText, MessageSender.USER);
    // Add user message to local state immediately
    // The effect hook [messages, chatId, onMessagesUpdate] will then persist this change.
    setMessages(prevMessages => [...prevMessages.filter(m => m.id !== TYPING_INDICATOR_ID), userMessage]);
    
    setIsLoading(true);
    showTypingIndicator();

    // Prepare history *before* adding the new user message for the API call
    // Or, if the API expects the latest user message in history, include it.
    // Current implementation sends history *including* the latest user message.
    const currentMessagesForHistory = messages.filter(m => m.id !== TYPING_INDICATOR_ID);
    const historyForN8n = [...currentMessagesForHistory, userMessage];


    try {
      const botResponseText = await getN8nChatResponse(userMessageText, historyForN8n, chatId);
      removeTypingIndicator();
      addMessageToList(createMessage(botResponseText, MessageSender.BOT));
    } catch (error) {
      removeTypingIndicator();
      const errorMessageText = error instanceof Error ? error.message : 'An unexpected error occurred communicating with the AI service.';
      addMessageToList(createMessage(errorMessageText, MessageSender.ERROR));
      console.error("Error handling send message with n8n service:", error);
    } finally {
      setIsLoading(false);
    }
  }, [addMessageToList, showTypingIndicator, removeTypingIndicator, chatId, messages]); // messages is a dependency for history

  const handleShareChat = async () => {
    const chatText = messages
      .filter(msg => msg.sender === MessageSender.USER || msg.sender === MessageSender.BOT)
      .map(msg => `${msg.sender === MessageSender.USER ? 'User' : 'Bot'}: ${msg.text}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(chatText);
      setShowCopiedNotification(true);
      setTimeout(() => setShowCopiedNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy chat text: ', err);
      alert('Failed to copy chat to clipboard. You may need to enable clipboard permissions for this site.');
    }
  };

  const handleSettingsClick = () => {
    alert('Settings functionality is not yet implemented.');
    setIsUserMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full max-h-screen bg-gray-800 text-white sm:shadow-inner overflow-hidden">
      <header className="bg-gray-700 p-3 sm:p-4 shadow-md flex-shrink-0 flex items-center justify-between min-h-[60px] sm:min-h-[68px] border-b border-gray-600">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-100">
            Conversation
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={handleShareChat}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700"
            title="Copy chat to clipboard"
            aria-live="polite"
          >
            <ShareIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-1.5" />
            Share
          </button>
          {showCopiedNotification && <span className="text-xs text-green-400 animate-pulse">Copied!</span>}
          
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-700"
              aria-label="Open user menu"
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              id="user-menu-button"
            >
              {userInfo.picture ? (
                <img
                  src={userInfo.picture}
                  alt="User avatar"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-500 group-hover:border-blue-400 transition-colors"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <DefaultAvatarIcon className="w-8 h-8 sm:w-9 sm:h-9 text-gray-400 p-1 bg-gray-600 rounded-full border-2 border-gray-500" />
              )}
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 py-1 origin-top-right"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
              >
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm font-semibold text-gray-100 truncate" title={userInfo.name}>
                    {userInfo.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate" title={userInfo.email}>
                    {userInfo.email || 'No email provided'}
                  </p>
                </div>
                <button
                  onClick={handleSettingsClick}
                  className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  role="menuitem"
                >
                  <SettingsIcon className="w-4 h-4 mr-3 text-gray-400" />
                  Settings
                </button>
                <button
                  onClick={() => { onLogout(); setIsUserMenuOpen(false); }}
                  className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  role="menuitem"
                >
                  <LogoutIcon className="w-4 h-4 mr-3 text-gray-400" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <ChatWindow messages={messages} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
