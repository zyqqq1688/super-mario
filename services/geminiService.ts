import { GoogleGenAI, Type } from "@google/genai";
import { AIGeneratedLevelInfo } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize only if key exists to prevent crashes in non-env setups
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateLevelTheme = async (themePrompt: string): Promise<AIGeneratedLevelInfo> => {
  if (!ai) {
    // Fallback if no API key
    return {
      name: "Mushroom Kingdom Plains",
      description: "A classic journey through green hills and dangerous pipes. (AI Key missing)",
      colorTheme: "from-blue-400 to-blue-200"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a creative name, a short whimsical description, and a Tailwind CSS gradient string for a ${themePrompt} platformer level.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            colorTheme: { 
              type: Type.STRING, 
              description: "A valid tailwind bg-gradient string, e.g., 'from-indigo-500 via-purple-500 to-pink-500'" 
            },
          },
          required: ["name", "description", "colorTheme"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as AIGeneratedLevelInfo;

  } catch (error) {
    console.error("AI Generation failed", error);
    return {
      name: "Glitch Valley",
      description: "The AI spirits were quiet today, so we loaded the backup coordinates.",
      colorTheme: "from-gray-700 to-gray-900"
    };
  }
};