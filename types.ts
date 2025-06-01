
export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  TYPING_INDICATOR = 'typing_indicator',
  ERROR = 'error',
}

export interface ChatMessageData {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: Date; // Ensure this is Date type
}

export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: number; // Store as timestamp (Date.now())
  // Optional: could store a snippet of the first/last message for display
  firstUserMessageSnippet?: string; 
}
