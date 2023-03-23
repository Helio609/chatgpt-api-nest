export type Message = { id: string; role: string; content: string };
export type Messages = Message[];

export interface OpenAIResponse {
  id: string;
  content: string;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamData extends Partial<OpenAIResponse> {
  delta?: string;
}
