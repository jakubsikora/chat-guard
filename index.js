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

app.post('/chat', async (req, res) => {})

app.get('/install', async (req, res) => {})

app.listen(port, () => {
  console.log(`Chat guard listening at http://localhost:${port}`)
})
