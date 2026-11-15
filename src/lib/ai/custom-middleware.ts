import { Experimental_LanguageModelV1Middleware } from "ai";

export const customMiddleware: Experimental_LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = Date.now();
    try {
      const result = await doGenerate();
      const latencyMs = Date.now() - startTime;
      if (process.env.NODE_ENV !== "production") {
        console.log(`[AI Engine] Call completed in ${latencyMs}ms. Tokens:`, result.usage);
      }
      return result;
    } catch (error) {
      console.error("[AI Engine] Execution failed:", error);
      throw error;
    }
  },
};
