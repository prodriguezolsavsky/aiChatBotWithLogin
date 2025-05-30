// import { ChatMessageData, MessageSender } from '../types';

// // TypeScript declaration to inform about APP_CONFIG on the window object
// declare global {
//   interface Window {
//     APP_CONFIG?: {
//       N8N_WEBHOOK_URL?: string;
//       API_KEY?: string; // Also declare API_KEY if it's moved here
//     };
//   }
// }

// const n8nWebhookUrlFromConfig = window.APP_CONFIG?.N8N_WEBHOOK_URL;

// if (!n8nWebhookUrlFromConfig || n8nWebhookUrlFromConfig === 'https://n8n-app.agreeableriver-225df3a2.westus.azurecontainerapps.io/webhook/chat') {
//   console.error("N8N Webhook URL is not configured or is still set to the placeholder in index.html (window.APP_CONFIG.N8N_WEBHOOK_URL). Chat functionality via n8n will not work. Please update it in index.html.");
// }

// interface N8NPayload {
//   userMessage: string;
//   chatHistory: { role: 'user' | 'model'; text: string }[];
// }

// interface N8NResponse {
//   aiResponse?: string; // Assuming n8n returns the AI response in this field
//   error?: string; // Optional error field from n8n
// }

// function formatChatHistoryForN8N(chatMessages: ChatMessageData[]): { role: 'user' | 'model'; text: string }[] {
//   return chatMessages
//     .filter(msg => msg.sender === MessageSender.USER || msg.sender === MessageSender.BOT)
//     .map(msg => {
//       const role = msg.sender === MessageSender.USER ? 'user' : 'model';
//       return {
//         role: role,
//         text: msg.text,
//       };
//     });
// }

// export async function getN8nChatResponse(
//   userMessage: string,
//   history: ChatMessageData[]
// ): Promise<string> {
//   const webhookUrl = window.APP_CONFIG?.N8N_WEBHOOK_URL;

//   if (!webhookUrl || webhookUrl === 'https://n8n-app.agreeableriver-225df3a2.westus.azurecontainerapps.io/webhook/chat') {
//     console.error("N8N Webhook URL is not configured or is still set to the placeholder in index.html. Please update it in index.html.");
//     throw new Error("N8N Webhook URL is not configured. Please set it in the APP_CONFIG script in index.html.");
//   }

//   const formattedHistory = formatChatHistoryForN8N(history);
//   const payload: N8NPayload = {
//     userMessage,
//     chatHistory: formattedHistory,
//   };

//   let response: Response;
//   try {
//     response = await fetch(webhookUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'application/json', // Explicitly ask for JSON
//       },
//       body: JSON.stringify(payload),
//     });
//   } catch (networkError) {
//     console.error('Network error calling n8n webhook:', networkError);
//     if (networkError instanceof Error) {
//       throw new Error(`Network error: Failed to communicate with n8n service: ${networkError.message}`);
//     }
//     throw new Error('An unknown network error occurred while contacting the n8n service.');
//   }

//   // Try to get the raw text of the response first for better debugging
//   let responseText: string = '';
//   try {
//     responseText = await response.text();
//   } catch (textError) {
//     console.error('Error reading response text from n8n service:', textError);
//     // If we can't even get text, use statusText if available
//     throw new Error(`Failed to read response from n8n service: ${response.status} ${response.statusText || 'Could not read response body'}`);
//   }

//   if (!response.ok) {
//     // response.ok is false if status is 4xx or 5xx
//     console.error(`n8n service responded with error ${response.status}. Body:`, responseText);
//     // Try to parse responseText as JSON in case the error is structured
//     try {
//         const errorData = JSON.parse(responseText);
//         const message = errorData?.message || errorData?.error || responseText;
//         throw new Error(`Failed to get response from n8n service: ${response.status} - ${message}`);
//     } catch (e) {
//         // If parsing error as JSON fails, use the raw text
//         throw new Error(`Failed to get response from n8n service: ${response.status} ${responseText || response.statusText}`);
//     }
//   }
  
//   // Handle 204 No Content specifically, as .json() would fail
//   if (response.status === 204 || !responseText.trim()) {
//     console.warn("n8n service returned a successful but empty response.", {status: response.status, body: responseText});
//     throw new Error("The n8n service returned a successful but empty response. Expected JSON with 'aiResponse'.");
//   }
  
//   let data: N8NResponse;
//   try {
//     data = JSON.parse(responseText);
//   } catch (parseError) {
//     console.error('Failed to parse JSON response from n8n service. Raw response text:', responseText, parseError);
//     throw new Error(`The n8n service returned an invalid JSON response. Check the console for the raw response text from n8n.`);
//   }

//   if (data.error) {
//     throw new Error(`n8n service returned an application error: ${data.error}`);
//   }
  
//   if (typeof data.aiResponse === 'string' && data.aiResponse.trim() !== '') {
//     return data.aiResponse;
//   } else {
//     console.warn("n8n service returned an empty or invalid 'aiResponse' in its JSON. Data received:", data);
//     throw new Error("The n8n service response did not contain a valid 'aiResponse' string.");
//   }
// }

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

if (!n8nWebhookUrlFromConfig || n8nWebhookUrlFromConfig === 'https://n8n-app.agreeableriver-225df3a2.westus.azurecontainerapps.io/webhook/chat') {
  console.error("N8N Webhook URL is not configured or is still set to the placeholder in index.html (window.APP_CONFIG.N8N_WEBHOOK_URL). Chat functionality via n8n will not work. Please update it in index.html.");
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

  if (!webhookUrl) {
    throw new Error("N8N Webhook URL is not configured. Please set it in the APP_CONFIG script in index.html.");
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
        throw new Error('The bot sent a JSON response, but it contained no usable text.');
      }
    } catch (parseError) {
      throw new Error(`The bot's JSON response was malformed. Raw response: "${responseText.substring(0, 150)}${responseText.length > 150 ? '...' : ''}"`);
    }
  } else {
    determinedReply = responseText.trim();
  }

  if (!determinedReply) {
    throw new Error('The bot returned an empty or unprocessable response.');
  }

  return determinedReply;
}
