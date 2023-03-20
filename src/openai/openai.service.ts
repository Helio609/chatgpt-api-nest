import { get_encoding, TiktokenEncoding } from '@dqbd/tiktoken';
import { Injectable } from '@nestjs/common';
import { ReplaySubject } from 'rxjs';
import { HttpService } from 'src/http/http.service';

export type OpenaiResponse = {
  id: string;
  content: string;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export interface StreamData {
  id?: string;
  delta?: string;
  /** only avalible in the last chunk of the stream */
  finish_reason?: string;
}

@Injectable()
export class OpenAIService {
  constructor(private readonly http: HttpService) { }

  async sendMessages(
    messages: { role: string; content: string }[],
    apiKey: string,
    model: string,
    stream = false,
    subject?: ReplaySubject<StreamData>,
  ): Promise<OpenaiResponse> {
    /** parpare the messages array to fit the token limit */
    /** perserve 1000 token for answering and 3000 token for the history */
    /** the message chain should be sorted in root -> chat_1 -> chat_2 -> ... */

    /** encoding for gpt-3.5 */
    const tokenSize = messages.map((message) =>
      this.tokenizer(message.content).length,
    );
    const sumTokenSize = () =>
      tokenSize.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
      );

    /** I'm so lazy, but anyways */
    /** TODO: make it configurable */
    while (sumTokenSize() > 3000) {
      /** remove the first message in every step until sum of token < 3000 */
      tokenSize.shift();
      messages.shift();
    }

    const response = await this.http.fetch({
      url: `${process.env.OPENAI_BASE_URL}/v1/chat/completions`,
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      data: {
        model,
        messages,
        stream,
      },
      responseType: stream ? 'stream' : 'json',
      validateStatus: () => true,
    });

    /** TODO: there have many error type when openai server returns status code != 200 */
    if (response.status != 200)
      throw Error(
        `error when fetch openai api: ${JSON.stringify(response.data)}`,
      );

    if (!stream) {
      const data = response.data
      const ans = data.choices[0]
      return {
        id: data.id,
        content: ans.message.content,
        finish_reason: ans.finish_reason,
        usage: data.usage,
      };
    }

    return new Promise((resolve) => {
      let rId: string;
      let rContent = '';
      let rFinishReason: string;
      const rPromptTokens = sumTokenSize();
      let rCompletionTokens = 0;

      response.data.on('data', (buffer: Buffer) => {
        let data = buffer.toString();
        if (data.startsWith('data: ')) data = data.substring(6);
        /** warning: some time the last chunk will be splited into "[DONE]", I don't know why */
        if (data.endsWith('data: [DONE]\n\n'))
          data = data.substring(0, data.length - 14);

        try {
          /** exception will only raised in last chunk: data: [DONE] */
          const json = JSON.parse(data);
          if (!rId) rId = json.id;
          if (json.choices[0].finish_reason) {
            rFinishReason = json.choices[0].finish_reason;
            subject.next({
              id: rId,
              finish_reason: rFinishReason,
            });
          }
          if (!json.choices[0].delta.content) return;
          rContent += json.choices[0].delta.content;
          rCompletionTokens += 1;
          subject.next({
            id: rId,
            delta: json.choices[0].delta.content,
            finish_reason: null
          });
        } catch { }
      });

      response.data.on('end', () => {
        subject.complete();
        resolve({
          id: rId,
          content: rContent,
          finish_reason: rFinishReason,
          usage: {
            prompt_tokens: rPromptTokens,
            completion_tokens: rCompletionTokens,
            total_tokens: rPromptTokens + rCompletionTokens,
          },
        });
      });
    });
  }

  tokenizer(message: string, encodeName: TiktokenEncoding = 'cl100k_base') {
    const enc = get_encoding(encodeName);
    return enc.encode(`${message}<|im_end|>`);
  }
}
