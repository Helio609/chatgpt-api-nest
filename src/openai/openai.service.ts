import { get_encoding } from '@dqbd/tiktoken';
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
  finish_reason?: string;
}

@Injectable()
export class OpenaiService {
  constructor(private readonly http: HttpService) {}

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
    const enc = get_encoding('cl100k_base');
    const tokenLengther = (content: string) =>
      enc.encode(`${content}<|im_end|>`).length;
    const tokenLengthes = messages.map((message) =>
      tokenLengther(message.content),
    );
    const sumTokenLength = () =>
      tokenLengthes.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
      );

    /** I'm so lazy, but anyways */
    while (sumTokenLength() > 3000) {
      /** remove the first message in every step until sum of token < 3000 */
      tokenLengthes.shift();
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
      return {
        id: response.data.id,
        content: response.data.choices[0].message.content,
        finish_reason: response.data.choices[0].finish_reason,
        usage: response.data.usage,
      };
    }

    return new Promise((resolve) => {
      let rId: string;
      let rContent = '';
      let rFinishReason: string;
      const rPromptTokens = sumTokenLength();
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
                finish_reason: rFinishReason,
              });
          }
          if (!json.choices[0].delta.content) return;
          rContent += json.choices[0].delta.content;
          rCompletionTokens += 1;
          subject.next({
            id: rId,
            delta: json.choices[0].delta.content,
            finish_reason: rFinishReason,
          });
        } catch {}
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

  tokenizer(message: string) {
    const enc = get_encoding('cl100k_base');
    return enc.encode(`${message}<|im_end|>`);
  }
}
