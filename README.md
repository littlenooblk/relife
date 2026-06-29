# 三国人生

一个三国时期人生模拟 Web MVP。玩家会随机获得出生年月、出生地点和出身，通过推荐选择或自由输入推动人生重大节点。

## 功能

- 随机出生于公元 184 年至 242 年之间，并从首版地点池中抽取三国时期中国区域内的出生地。
- 展示人物档案、当前地点、关系、特质、资源和近期经历。
- 每个节点提供推荐选择，也支持玩家输入自定义行动。
- 服务端通过 OpenAI 兼容 Chat Completions API 生成剧情。
- 未配置 `LLM_API_KEY` 时自动使用本地 Mock 剧情，便于先体验流程。

## 运行

```bash
npm install
npm run dev
```

然后打开 http://localhost:3000。

## 配置大模型

复制环境变量示例：

```bash
cp .env.example .env.local
```

填写：

```bash
LLM_API_KEY=你的 API Key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

`LLM_BASE_URL` 使用 OpenAI 兼容格式，可以替换为 DeepSeek、通义千问等兼容服务的地址。

## 首版边界

- 只支持三国时期与当时中国范围。
- 不含登录、存档、多人、图片生成和付费。
- 历史准确性由内置上下文和 prompt 约束保障，首版不接外部知识库检索。
