# Chat guard

This integration deactives chat for specified rules e.g. unknown user-agent.

## Installation

1. Run

```
npm i
```

2. Create an app in [Developer Console](https://developers.livechat.com/console/).
3. Create Authorization building block (server-side).
4. Write down `client_id` and `client_secret`.
5. Run

```
cp .env.template .env
```

6. Populate .env.
7. Run

```
npm start
```

### Homework

Using [Agent Chat API](https://developers.livechat.com/docs/messaging/agent-chat-api/#introduction) send a message only to the agent with body:
`[chat-guard] Chat closed due to incorrect user agent`
