require('dotenv/config')
const axios = require('axios')
const oauth = require('axios-oauth-client')
const express = require('express')
const app = express()
app.use(express.json())
const port = 3000

const apiClient = axios.create({
  baseURL: process.env.API_URL,
})

// DON'T DO IT IN PROD
let accessToken

app.post('/chat', async (req, res) => {
  try {
    const { body } = req
    const chat = body.payload.chat
    const users = chat.users
    const customer = users.find(user => user.type === 'customer')
    const { user_agent } = customer.last_visit
    console.log('user_agent', user_agent)
    console.log('accessToken', accessToken)
    const closeChat = async id => {
      try {
        await apiClient.post(
          '/v3.3/agent/action/deactivate_chat',
          {
            id,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
      } catch (error) {
        if (error.response && error.response.data) {
          const data = error.response.data
          console.log('closeChat error', data.error)
        }
      }
    }

    if (user_agent.includes('chat-guard')) {
      await closeChat(chat.id)
    }

    res.status(200).send()
  } catch (error) {
    console.log('error', error)
    res.status(500).send()
  }
})

app.get('/install', async (req, res) => {
  const { code } = req.query

  const getLCAuthorizationCode = oauth.client(axios.create(), {
    url: `${process.env.ACCOUNTS_URL}/token`,
    grant_type: 'authorization_code',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: `${process.env.INTEGRATION_URL}/install`,
    code,
  })

  const checkWebhook = async accessToken => {
    try {
      console.log('sending /v3.3/configuration/action/list_webhooks...')

      const { data } = await apiClient.post(
        '/v3.3/configuration/action/list_webhooks',
        {
          owner_client_id: process.env.CLIENT_ID,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      console.log('accessToken', accessToken)
      console.log('data', data)

      return data.some(item => item.action === 'incoming_chat')
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data
        console.log('checkWebhook error', data.error)
      }
    }
  }

  const registerWebhook = async accessToken => {
    try {
      console.log('sending /v3.3/configuration/action/register_webhook...')

      const { data } = await apiClient.post(
        '/v3.3/configuration/action/register_webhook',
        {
          url: `${process.env.INTEGRATION_URL}/chat`,
          description: 'Test webhook',
          action: 'incoming_chat',
          secret_key: 'secret',
          owner_client_id: process.env.CLIENT_ID,
          type: 'license',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      console.log(data)
      return data
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data
        console.log('registerWebhooks error', data.error)
      }
    }
  }

  const enableWebhook = async accessToken => {
    try {
      console.log(
        'sending /v3.3/configuration/action/enable_license_webhooks...'
      )

      await apiClient.post(
        '/v3.3/configuration/action/enable_license_webhooks',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data
        console.log('enableWebhook error', data.error)
      }
    }
  }

  try {
    const auth = await getLCAuthorizationCode()
    accessToken = auth.access_token

    const exists = await checkWebhook(accessToken)

    if (!exists) {
      await registerWebhook(accessToken)
    }
    await enableWebhook(accessToken)

    res.send('<script>window.close();</script > ')
  } catch (error) {
    console.log('error', error)
    res.send(`Error: ${error.message}`)
  }
})

app.listen(port, () => {
  console.log(`Chat guard listening at http://localhost:${port}`)
})
