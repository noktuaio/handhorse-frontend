type InterpretPromptRequest = {
  prompt: string;
};

type InterpretPromptResponse = {
  data: unknown;
  uiSchema: unknown;
};

export async function interpretPrompt(request: InterpretPromptRequest): Promise<InterpretPromptResponse> {
  const response = await fetch("/api/ai/interpret", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Falha ao interpretar prompt.");
  }

  return response.json();
}
