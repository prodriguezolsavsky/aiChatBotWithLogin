
import { ChatMessageData, MessageSender } from '../types';

// TypeScript declaration to inform about APP_CONFIG on the window object
declare global {
  interface Window {
    APP_CONFIG?: {
      N8N_WEBHOOK_URL?: string;
      API_KEY?: string; // Also declare API_KEY if it's moved here
    };
  }
}

const n8nWebhookUrlFromConfig = window.APP_CONFIG?.N8N_WEBHOOK_URL;

if (!n8nWebhookUrlFromConfig || n8nWebhookUrlFromConfig === 'YOUR_N8N_WEBHOOK_URL_HERE') {
  console.error("N8N Webhook URL is not configured or is still set to the placeholder 'YOUR_N8N_WEBHOOK_URL_HERE' in index.html (window.APP_CONFIG.N8N_WEBHOOK_URL). Chat functionality via n8n will not work. Please update it in index.html.");
}

interface N8NPayloadData {
  userMessage: string;
  chatHistory: { role: 'user' | 'model'; text: string }[];
}

interface N8NResponse {
  aiResponse?: string; // Assuming n8n returns the AI response in this field
  error?: string; // Optional error field from n8n
}

function formatChatHistoryForN8N(chatMessages: ChatMessageData[]): { role: 'user' | 'model'; text: string }[] {
  return chatMessages
    .filter(msg => msg.sender === MessageSender.USER || msg.sender === MessageSender.BOT)
    .map(msg => {
      const role = msg.sender === MessageSender.USER ? 'user' : 'model';
      return {
        role: role,
        text: msg.text,
      };
    });
}

export async function getN8nChatResponse(
  userMessage: string,
  history: ChatMessageData[],
  sessionId: string // <-- agrega este parámetro
): Promise<string> {
  const webhookUrl = window.APP_CONFIG?.N8N_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl === 'YOUR_N8N_WEBHOOK_URL_HERE') { // Added check for placeholder here too for robustness
    throw new Error("N8N Webhook URL is not configured or is still the placeholder. Please set it in the APP_CONFIG script in index.html.");
  }

  // El body debe coincidir con el que funciona en tu otro ejemplo
  const bodyPayload = {
    mensaje: userMessage,
    sessionId: sessionId,
  };

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain',
      },
      body: JSON.stringify(bodyPayload),
    });
  } catch (networkError) {
    console.error('Network error calling n8n webhook:', networkError);
    throw new Error('Network error: Failed to communicate with n8n service.');
  }

  let responseText = '';
  try {
    responseText = await response.text();
  } catch (textError) {
    console.error('Error reading response text from n8n service:', textError);
    throw new Error('Failed to read the response from the bot service.');
  }

  if (!response.ok) {
    let errorMessage = responseText || response.statusText;
    try {
      const jsonError = JSON.parse(responseText);
      errorMessage = jsonError.error?.message || jsonError.message || responseText;
    } catch (e) {}
    throw new Error(`The bot service returned an error (status ${response.status}): ${errorMessage}`);
  }

  if (responseText.trim() === '') {
    return "The bot didn't provide a specific response this time.";
  }

  const contentType = response.headers.get('content-type');
  let determinedReply: string | undefined;

  if (contentType && contentType.toLowerCase().includes('application/json')) {
    try {
      const data: any = JSON.parse(responseText);
      if (typeof data.output === 'string' && data.output.trim() !== '') {
        determinedReply = data.output.trim();
      } else if (typeof data.reply === 'string' && data.reply.trim() !== '') {
        determinedReply = data.reply.trim();
      } else if (typeof data.answer === 'string' && data.answer.trim() !== '') {
        determinedReply = data.answer.trim();
      } else {
        const firstStringValue = Object.values(data).find(
          value => typeof value === 'string' && (value as string).trim() !== ''
        );
        if (typeof firstStringValue === 'string') {
          determinedReply = (firstStringValue as string).trim();
        }
      }
      if (!determinedReply) {
        // Keep the original behavior if JSON parsing fails to find a string, but log it
        console.warn('The bot sent a JSON response, but it contained no usable text field (output, reply, answer, or first string property). Raw response:', responseText);
        // Fallback to using the raw responseText if it's not just an empty JSON object string like "{}"
        if (responseText.trim() !== "" && responseText.trim() !== "{}") {
            determinedReply = responseText.trim();
        } else {
            throw new Error('The bot sent a JSON response, but it contained no usable text.');
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, but there's text, use the text.
      console.warn(`The bot's response was expected to be JSON but was malformed or couldn't be processed as such. Falling back to raw text. Parse error: ${parseError}. Raw response: "${responseText.substring(0, 150)}${responseText.length > 150 ? '...' : ''}"`);
      determinedReply = responseText.trim();
      if (!determinedReply) {
         throw new Error(`The bot's JSON response was malformed and no fallback text available. Raw response: "${responseText.substring(0, 150)}${responseText.length > 150 ? '...' : ''}"`);
      }
    }
  } else {
    determinedReply = responseText.trim();
  }

  if (!determinedReply) {
    throw new Error('The bot returned an empty or unprocessable response.');
  }

  return determinedReply;
}
