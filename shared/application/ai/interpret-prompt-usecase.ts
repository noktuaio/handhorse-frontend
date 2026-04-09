import { interpretPrompt } from "@/shared/infrastructure/ai/ai-client";

export async function interpretPromptUseCase(prompt: string) {
  const response = await interpretPrompt({ prompt });
  return response;
}
