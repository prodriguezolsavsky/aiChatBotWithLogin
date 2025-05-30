
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessageData, MessageSender } from '../types';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';
import { getN8nChatResponse } from '../services/n8nService'; // Updated import

const TYPING_INDICATOR_ID = 'typing-indicator-message';

interface UserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface ChatPageProps {
  userInfo: UserInfo;
  onLogout: () => void;
}

const createMessage = (text: string, sender: MessageSender): ChatMessageData => ({
  id: Date.now().toString(36) + Math.random().toString(36).substring(2),
  text,
  sender,
  timestamp: new Date(),
});

export const ChatPage: React.FC<ChatPageProps> = ({ userInfo, onLogout }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null); // Still used for localStorage keys
  const hasInitializedMessages = useRef(false);

  // Initialize or retrieve user-specific session ID (for localStorage)
  useEffect(() => {
    const userSpecificSessionKey = `chatSessionId_user_${userInfo.id}`;
    let sid = localStorage.getItem(userSpecificSessionKey);
    if (!sid) {
      sid = `user_${userInfo.id}_${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
      localStorage.setItem(userSpecificSessionKey, sid);
    }
    setSessionId(sid);
  }, [userInfo.id]);

  // Load messages from localStorage and set initial message
  useEffect(() => {
    if (sessionId && !hasInitializedMessages.current) {
      const storedMessagesKey = `chatMessages_${sessionId}`;
      const storedMessages = localStorage.getItem(storedMessagesKey);
      if (storedMessages) {
        try {
          const parsedMessages: ChatMessageData[] = JSON.parse(storedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (e) {
          console.error("Failed to parse stored messages:", e);
          setMessages([
            createMessage(`Welcome back, ${userInfo.name || 'User'}! How can I help you today?`, MessageSender.BOT)
          ]);
        }
      } else {
         setMessages([
          createMessage(`Hello, ${userInfo.name || 'User'}! How can I help you today?`, MessageSender.BOT)
        ]);
      }
      hasInitializedMessages.current = true;
    }
  }, [sessionId, userInfo.name]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (sessionId && messages.length > 0 && hasInitializedMessages.current) {
      const storedMessagesKey = `chatMessages_${sessionId}`;
      localStorage.setItem(storedMessagesKey, JSON.stringify(messages));
    }
  }, [messages, sessionId]);
  
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
    if (!sessionId) {
      console.error("Session ID not available for local storage. Cannot send message.");
      addMessageToList(createMessage("Error: Session ID is missing for storage. Please refresh the page.", MessageSender.ERROR));
      return;
    }
    
    const userMessage = createMessage(userMessageText, MessageSender.USER);
    setMessages(prevMessages => [...prevMessages.filter(m => m.id !== TYPING_INDICATOR_ID), userMessage]);

    setIsLoading(true);
    showTypingIndicator();

    const historyForN8N = messages.filter(m => m.id !== TYPING_INDICATOR_ID && (m.sender === MessageSender.USER || m.sender === MessageSender.BOT));

    try {
      // Use the new n8n service
      const botResponseText = await getN8nChatResponse(userMessageText, historyForN8N);
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
  }, [addMessageToList, showTypingIndicator, removeTypingIndicator, sessionId, messages]);

  return (
    <div className="flex flex-col h-full max-h-screen bg-gray-900 text-white sm:max-w-2xl md:max-w-3xl mx-auto sm:shadow-2xl sm:rounded-lg sm:my-0 md:my-4 overflow-hidden">
      <header className="bg-gray-800 p-3 sm:p-4 shadow-md flex-shrink-0 flex items-center justify-between min-h-[60px] sm:min-h-[68px]">
        <div className="flex items-center space-x-2 sm:space-x-3">
            {userInfo.picture && (
            <img 
                src={userInfo.picture} 
                alt={userInfo.name || 'User avatar'} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-blue-400" 
                referrerPolicy="no-referrer" 
            />
            )}
            <div>
                <span className="text-base sm:text-lg font-semibold text-white truncate max-w-[120px] sm:max-w-[180px] md:max-w-[250px]" title={userInfo.name || 'AI Chat Assistant'}>
                    {userInfo.name || 'AI Chat Assistant'}
                </span>
                {/* You might want to update "Powered by Gemini" if your n8n uses a different model */}
                {userInfo.name && <p className="text-xs text-gray-400 hidden sm:block">Powered by AI</p>}
                {!userInfo.name && <p className="text-xs text-gray-400 hidden sm:block">Powered by AI</p>}
            </div>
        </div>
        <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            aria-label="Logout"
        >
            Logout
        </button>
      </header>
      <ChatWindow messages={messages} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
