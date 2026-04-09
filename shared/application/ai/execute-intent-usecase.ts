type ExecuteIntentRequest = {
  intentId: string;
  payload: unknown;
};

type ExecuteIntentResponse = {
  data: unknown;
  uiSchema: unknown;
};

export async function executeIntentUseCase(request: ExecuteIntentRequest): Promise<ExecuteIntentResponse> {
  const response = await fetch("/api/ai/execute-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Falha ao executar intent.");
  }

  return response.json();
}
