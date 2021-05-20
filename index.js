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

const enableWebhook = async () => {
  try {
    console.log(
      'sending https://api.livechatinc.com/v3.3/configuration/action/enable_license_webhooks'
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
      console.log('enableWebhook error', error.response.data.error)
    }
  }
}

const registerWebhook = async () => {
  try {
    console.log(
      'sending https://api.livechatinc.com/v3.3/configuration/action/register_webhook'
    )

    const { data } = await apiClient.post(
      '/v3.3/configuration/action/register_webhook',
      {
        url: `${process.env.INTEGRATION_URL}/chat`,
        description: 'Test webhook',
        action: 'incoming_chat',
        secret_key: 'secret',
        type: 'license',
        owner_client_id: process.env.CLIENT_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('data', data)
    return data
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('registerWebhook error', error.response.data.error)
    }
  }
}

const checkWebhookExists = async () => {
  try {
    console.log(
      'sending https://api.livechatinc.com/v3.3/configuration/action/list_webhooks'
    )

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

    console.log('data', data)
    return data.some(item => item.action === 'incoming_chat')
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('checkWebhook error', error.response.data.error)
    }
  }
}

const closeChat = async id => {
  try {
    console.log('closing chat', id)
    await apiClient.post(
      '/v3.3/agent/action/deactivate_chat',
      {
        id,
      },
      {
        headers: {
          Authorization: `Bearer ACCESS_TOKEN`,
        },
      }
    )
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('closeChat error', error.response.data.error)
    }
  }
}

app.post('/chat', async (req, res) => {
  try {
    const { body } = req
    const chat = body.payload.chat
    const users = chat.users
    const customer = users.find(user => user.type === 'customer')
    const { user_agent } = customer.last_visit

    console.log('user_agent', user_agent)
    if (user_agent.includes('chat-guard')) {
      await closeChat(chat.id)
    }

    res.status(200).send()
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('deactivate chat error', error.response.data.error)
    }
  }
})

app.get('/install', async (req, res) => {
  const { code } = req.query

  const getAuth = oauth.client(axios.create(), {
    url: `${process.env.ACCOUNTS_URL}/token`,
    grant_type: 'authorization_code',
    client_id: `${process.env.CLIENT_ID}`,
    client_secret: `${process.env.CLIENT_SECRET}`,
    redirect_uri: `${process.env.INTEGRATION_URL}/install`,
    code,
  })

  try {
    const auth = await getAuth()
    accessToken = auth.access_token

    console.log('accessToken', accessToken)

    const exists = await checkWebhookExists()

    console.log('exists', exists)

    if (!exists) {
      await registerWebhook()
      await enableWebhook()
    }

    res.send('<script>window.close();</script>')
  } catch (error) {
    console.log('error', error)
    res.send(`Error: ${error.message}`)
  }
})

app.listen(port, () => {
  console.log(`Chat guard listening at http://localhost:${port}`)
})
