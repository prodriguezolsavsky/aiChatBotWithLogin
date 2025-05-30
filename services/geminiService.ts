
import { GoogleGenAI, GenerateContentResponse, Content, Part } from "@google/genai";
import { ChatMessageData, MessageSender } from '../types';

// TypeScript declaration to inform about APP_CONFIG on the window object
// This might be duplicated if n8nService.ts is also imported, but it's safe.
declare global {
  interface Window {
    APP_CONFIG?: {
      N8N_WEBHOOK_URL?: string;
      API_KEY?: string;
    };
  }
}

const apiKeyFromConfig = window.APP_CONFIG?.API_KEY;

if (!apiKeyFromConfig || apiKeyFromConfig === 'IzaSyCZ3yvxwx1GCq19HUs3sWL9obh7eIPsxnk') {
  console.error("Gemini API Key (API_KEY) is not configured or is set to placeholder in index.html (window.APP_CONFIG.API_KEY). Chat functionality using Gemini will not work. Please update it in index.html.");
}

const ai = new GoogleGenAI({ apiKey: apiKeyFromConfig! }); // Use non-null assertion, error above should catch undefined
const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

function formatChatHistoryForGemini(chatMessages: ChatMessageData[]): Content[] {
  return chatMessages
    .filter(msg => msg.sender === MessageSender.USER || msg.sender === MessageSender.BOT)
    .map(msg => {
      const role = msg.sender === MessageSender.USER ? 'user' : 'model';
      return {
        role: role,
        parts: [{ text: msg.text }] as Part[],
      };
    }) as Content[];
}

export async function getGeminiChatResponse(
  userMessage: string,
  history: ChatMessageData[] // This is the existing chat history from ChatPage
): Promise<string> {
  const currentApiKey = window.APP_CONFIG?.API_KEY;
  if (!currentApiKey || currentApiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error("Gemini API Key is not configured. Please set it in the APP_CONFIG script in index.html.");
  }
  // If the key might change dynamically and the 'ai' instance needs re-initialization,
  // you might need to re-initialize 'ai' here or ensure it's always up-to-date.
  // For simplicity, we assume it's set at load time.

  const formattedHistory = formatChatHistoryForGemini(history);

  try {
    // If 'ai' was initialized with a placeholder, it might fail.
    // It's better to initialize 'ai' only when key is valid, or handle error better.
    // For now, rely on the initial check.
    const chat = ai.chats.create({
      model: GEMINI_MODEL_NAME,
      history: formattedHistory,
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: userMessage });
    
    const responseText = response.text;
    if (responseText === null || responseText === undefined || responseText.trim() === "") {
        console.warn("Gemini API returned a response without text or empty text.", response);
        throw new Error("The AI assistant returned an empty response.");
    }
    return responseText;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
      // Check for specific Gemini API error structures if available, otherwise use message
      // For example, error.response?.data?.error?.message
      throw new Error(`Failed to get response from AI: ${error.message}`);
    }
    throw new Error('An unknown error occurred while contacting the AI assistant.');
  }
}