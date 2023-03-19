# ChatGPT API Powered By NestJS

Hi there

这是个基于NestJs编写的ChatGPT后端，支持基本的用户注册登录以及JWT认证，支持两种传输方式。

1. 流式传输，请求接口后返回RequestId，随后用该Id请求SSE接口，从而得到Token流，格式如下。

```typescript
export interface StreamData {
  id: string
  delta: string
  finish_reason: string
}
```

2. 常规传输，若生成字符较多，等待时间较长，推荐优先使用流式传输，返回格式如下。

```typescript
export type OpenaiResponse = {
  id: string
  content: string
  finish_reason: string,
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

## 使用

1. 安装依赖

```shell
yarn
```

2. `.env.example`修改数据库配置以及初始OpenAi Api Key配置，更改名称为`.env`
3. 启动`next build && next start `，默认工作端口在3000

## 接口

1. POST /auth/login

```typescript
// Request
{
	username: string,
	password: string
}
// Response
{
    access_token: string
}
```

2. POST /auth/register

```typescript
// Request
{
	username: string,
	password: string
}
// Response
{
    sub: string
    username: string
}
```

3. POST /chat/process

```typescript
// Request With JWT
{
	// 留空系统自动生成，后续携带session_id请求有上下文
	session_id?: string,
	message: string,
	stream?: boolean
}
// Response 流式请求
{
    session_id: string,
    request_id: string
}
// Response 正常请求
{
  id: string,
  content: string,
  finish_reason: string,
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

4. GET /chat/process/:requestId

```typescript
// SSE推送
{
    id: string,
    delta: string
}
```

