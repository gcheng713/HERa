import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = import.meta.env.VITE_OPENAI_API_KEY
  ? new OpenAI({ 
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    })
  : null;

export async function getAIResponse(message: string): Promise<string> {
  if (!openai) {
    return "I apologize, but I'm not available at the moment. Please try again later when the AI service is configured.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a compassionate healthcare assistant focused on providing accurate, helpful information about reproductive healthcare and abortion services. Maintain a professional and supportive tone. Provide factual, up-to-date information about legal statuses, access to care, and available resources. When discussing specific medical advice or legal restrictions, remind users to consult with healthcare professionals or legal experts for personalized guidance.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI response error:", error);
    return "I apologize, but I'm having trouble responding right now. Please try again later.";
  }
}