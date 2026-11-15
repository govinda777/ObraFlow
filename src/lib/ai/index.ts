import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "",
});

let wrappedModel: any = null;

export const geminiFlashModel = new Proxy({} as any, {
  get(target, prop) {
    if (!wrappedModel) {
      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      wrappedModel = wrapLanguageModel({
        model: google(modelName),
        middleware: customMiddleware,
      });
    }
    const value = wrappedModel[prop];
    return typeof value === "function" ? value.bind(wrappedModel) : value;
  },
});
