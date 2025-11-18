const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Partials
} = require('discord.js');
const fs = require('fs');
const express = require('express');
const crypto = require('crypto');

// ====== إعدادات عامة ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers // مهم عشان الرتب
    ],
    partials: [Partials.Channel] // لاستقبال رسائل الخاص
});

const REVIEW_CHANNEL_ID = '1438169825489719326';
const PREFIX = '-';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const PORT = process.env.BOT_PORT || process.env.PORT || 5050;

const translations = {
    en: {
        productAdded: 'Product added successfully!',
        keyAdded: 'Key added to product successfully!',
        productNotFound: 'Product not found!',
        selectProduct: 'Select a product to buy:',
        selectPayment: 'Select your payment method:',
        noProducts: 'No products available!',
        noStock: 'This product is out of stock!',
        invoiceTitle: 'Payment Invoice',
        invoiceNumber: 'Invoice Number',
        product: 'Product',
        price: 'Price',
        paymentMethod: 'Payment Method',
        sendProof: 'Please send your payment proof as an image or message to the bot in DM.',
        proofReceived: 'Payment proof received! Waiting for owner approval...',
        orderApproved: 'Your order has been approved! Here is your key:',
        orderRejected: 'Your order has been rejected.',
        approveOrder: 'Approve Order',
        rejectOrder: 'Reject Order',
        discountAdded: 'Discount code created successfully!',
        discountApplied: 'Discount code applied! You will get {percent}% off your next purchase.',
        discountInvalid: 'Invalid or expired discount code!',
        discountUsed: 'You already have a discount applied!',
        rateExperience: 'Please rate your experience:',
        reviewReceived: 'Thank you for your review!',
        languageChanged: 'Language changed!',
        customer: 'Customer',
        comment: 'Comment',
        orderPending: 'New Order Pending Approval',
        // shop button + language
        shopButtonText: '🛒 Click the button below to browse products and choose your payment method.',
        shopSelectProduct: '🛍 Select the product you want to buy:',
        langSelectTitle: 'Choose your language',
        langSelectContent: '🌐 Choose your preferred language. All future bot messages will use this language.',
        paymentInstructionsTitle: 'Payment Instructions',
        payment_STC_BARQ: '💳 STC Pay / Barq:\nOpen a ticket in the server to get the transfer number, then send a screenshot of the payment to the bot in DM for verification.',
        payment_GIFTCARD: '🧺 Gift Card:\nThe gift card must be from this site only:\nhttps://skine.com/en-us/rewarble\nAfter purchasing, send the code or screenshot to the bot in DM.',
        payment_BANK: '🏦 Bank Transfer:\nIBAN: `SA1980204507849222121014`\nTransfer the amount, then send a screenshot of the transfer receipt to the bot in DM for verification.',
        payment_PAYPAL: '💰 PayPal:\nPay to this email:\n`17sutef2@gmail.com`\nAfter paying, send a screenshot to the bot in DM for verification.',
        paymentNoteFooter: 'After paying, you must send a screenshot of the payment to the bot in DM for verification.'
    },
    ar: {
        productAdded: 'تم إضافة المنتج بنجاح!',
        keyAdded: 'تم إضافة المفتاح للمنتج بنجاح!',
        productNotFound: 'المنتج غير موجود!',
        selectProduct: 'اختر منتجاً للشراء:',
        selectPayment: 'اختر طريقة الدفع:',
        noProducts: 'لا توجد منتجات متاحة!',
        noStock: 'هذا المنتج غير متوفر حالياً!',
        invoiceTitle: 'فاتورة الدفع',
        invoiceNumber: 'رقم الفاتورة',
        product: 'المنتج',
        price: 'السعر',
        paymentMethod: 'طريقة الدفع',
        sendProof: 'يرجى إرسال إثبات الدفع (صورة أو رسالة) للبوت في الخاص للتحقق من العملية.',
        proofReceived: 'تم استلام إثبات الدفع! في انتظار موافقة المالك...',
        orderApproved: 'تمت الموافقة على طلبك! إليك المفتاح:',
        orderRejected: 'تم رفض طلبك.',
        approveOrder: 'قبول الطلب',
        rejectOrder: 'رفض الطلب',
        discountAdded: 'تم إنشاء كود الخصم بنجاح!',
        discountApplied: 'تم تطبيق كود الخصم! ستحصل على خصم {percent}% على الشراء القادم.',
        discountInvalid: 'كود خصم غير صالح أو منتهي!',
        discountUsed: 'لديك بالفعل كود خصم مطبق!',
        rateExperience: 'يرجى تقييم تجربتك:',
        reviewReceived: 'شكراً لتقييمك!',
        languageChanged: 'تم تغيير لغتك بنجاح!',
        customer: 'العميل',
        comment: 'التعليق',
        orderPending: 'طلب جديد في انتظار الموافقة',
        // زر الشوب + اللغة
        shopButtonText: '🛒 اضغط زر الشراء بالأسفل لاختيار المنتج وطريقة الدفع.',
        shopSelectProduct: '🛍 اختر المنتج الذي تريد شراءه:',
        langSelectTitle: 'اختر لغتك',
        langSelectContent: '🌐 اختر اللغة المفضلة لك، كل رسائل البوت القادمة ستكون بهذه اللغة.',
        paymentInstructionsTitle: 'تعليمات الدفع',
        payment_STC_BARQ: '💳 STC Pay / برق:\nافتح تذكرة في السيرفر لتحصل على رقم التحويل، ثم أرسل صورة الإيصال للبوت في الخاص للتحقق من عملية الدفع.',
        payment_GIFTCARD: '🧺 بطاقة هدية (Gift Card):\nيجب أن تكون البطاقة من هذا الموقع فقط:\nhttps://skine.com/en-us/rewarble\nبعد الشراء، أرسل الكود أو صورة البطاقة للبوت في الخاص.',
        payment_BANK: '🏦 التحويل البنكي:\nرقم الآيبان:\n`SA1980204507849222121014`\nحوّل المبلغ ثم أرسل صورة إيصال التحويل للبوت في الخاص للتحقق.',
        payment_PAYPAL: '💰 PayPal:\nادفع على هذا الإيميل:\n`17sutef2@gmail.com`\nبعد الدفع، أرسل صورة الدفع للبوت في الخاص للتحقق.',
        paymentNoteFooter: 'بعد الدفع، يجب إرسال صورة إثبات الدفع للبوت في الخاص للتحقق من العملية.'
    }
};

// ====== دوال البيانات (data.json) ======
function loadData() {
    try {
        const raw = fs.readFileSync('data.json', 'utf8');
        const data = JSON.parse(raw);
        data.products = data.products || {};
        data.orders = data.orders || {};
        data.invoiceCounter = data.invoiceCounter || 1000;
        data.userLanguages = data.userLanguages || {};
        data.discounts = data.discounts || {};
        data.discountRedemptions = data.discountRedemptions || {};
        data.reviews = data.reviews || [];
        return data;
    } catch (err) {
        return {
            products: {},
            orders: {},
            invoiceCounter: 1000,
            userLanguages: {},
            discounts: {},
            discountRedemptions: {},
            reviews: []
        };
    }
}

function saveData(data) {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

function getLang(userId) {
    const data = loadData();
    return data.userLanguages[userId] || 'en';
}

function t(userId, key, vars = {}) {
    const lang = getLang(userId);
    let text = translations[lang][key] || translations.en[key] || key;
    Object.keys(vars).forEach(v => {
        text = text.replace(`{${v}}`, vars[v]);
    });
    return text;
}

// ====== دالة إعطاء رتبة Customer ======
async function giveCustomerRole(userId) {
    const SERVER_ID = "1438166903381033064";
    const CUSTOMER_ROLE_ID = "1438169633365430272";
    const OWNER_ID = process.env.OWNER_ID;

    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        if (!guild) throw new Error("Guild not found");

        const member = await guild.members.fetch(userId);
        if (!member) throw new Error("Member not found in guild");

        if (member.roles.cache.has(CUSTOMER_ROLE_ID)) {
            console.log(`ℹ️ User ${member.user.tag} already has Customer role.`);
            return;
        }

        await member.roles.add(CUSTOMER_ROLE_ID);
        console.log(`✔️ Customer role assigned to ${member.user.tag}`);
    } catch (err) {
        console.error("❌ Failed to assign Customer role:", err);
        if (OWNER_ID) {
            try {
                const owner = await client.users.fetch(OWNER_ID);
                await owner.send(
                    `⚠️ **Failed to assign Customer role** to user <@${userId}>.\nError: ${err.message}`
                );
            } catch (dmErr) {
                console.error("❌ Failed to DM OWNER about role assignment error:", dmErr);
            }
        }
    }
}

// ====== Discord Bot ======
client.once('clientReady', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`📦 Serving ${Object.keys(loadData().products).length} products`);
});

// ====== أوامر البوت الأساسية ======
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // لو مو أمر ويكتب في الخاص → نعتبره إثبات دفع
    if (!message.content.startsWith(PREFIX)) {
        if (message.channel.type === 1 || message.channel.type === 'DM') {
            handleDMProof(message);
        }
        return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift().toLowerCase();

    // أمر المساعدة
    if (command === 'help') {
        return message.reply(
            [
                '📜 **الأوامر المتاحة / Available Commands:**',
                '',
                '-help',
                '-addproduct id | name | price',
                '-addkey productId | keyValue',
                '-buy',
                '-discount CODE',
                '-lang en',
                '-lang ar',
                '-sendshopbutton (owner only)',
                '-sendlang (owner only)'
            ].join('\n')
        );
    }

    // إضافة منتج
    if (command === 'addproduct') {
        if (message.author.id !== process.env.OWNER_ID) return;

        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim());

        if (parts.length < 3) {
            return message.reply('Usage: -addproduct id | name | price');
        }

        const [id, name, price] = parts;
        const data = loadData();

        data.products[id] = {
            id,
            name,
            price: parseFloat(price),
            keys: []
        };

        saveData(data);
        message.reply(t(message.author.id, 'productAdded'));
    }

    // إضافة مفتاح
    if (command === 'addkey') {
        if (message.author.id !== process.env.OWNER_ID) return;

        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim());

        if (parts.length < 2) {
            return message.reply('Usage: -addkey productId | keyValue');
        }

        const [productId, keyValue] = parts;
        const data = loadData();

        if (!data.products[productId]) {
            return message.reply(t(message.author.id, 'productNotFound'));
        }

        data.products[productId].keys.push({
            value: keyValue,
            used: false
        });

        saveData(data);
        message.reply(t(message.author.id, 'keyAdded'));
    }

    // أمر الشراء القديم عبر منشن
    if (command === 'buy') {
        const data = loadData();
        const products = Object.values(data.products);

        if (products.length === 0) {
            return message.reply(t(message.author.id, 'noProducts'));
        }

        const options = products.map(p => ({
            label: `${p.name} - ${p.price}`,
            description: `Stock: ${p.keys.filter(k => !k.used).length}`,
            value: p.id
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder(t(message.author.id, 'selectProduct'))
                .addOptions(options)
        );

        await message.reply({
            content: t(message.author.id, 'selectProduct'),
            components: [row]
        });
    }

    // إضافة كود خصم
    if (command === 'adddiscount') {
        if (message.author.id !== process.env.OWNER_ID) return;

        const input = args.join(' ');
        const parts = input.split('|').map(p => p.trim());

        if (parts.length < 2) {
            return message.reply('Usage: -adddiscount CODE | PERCENT | MAX_USES(optional)');
        }

        const [code, percent, maxUses] = parts;
        const data = loadData();

        data.discounts[code.toUpperCase()] = {
            percent: parseFloat(percent),
            maxUses: maxUses ? parseInt(maxUses) : null,
            usedCount: 0
        };

        saveData(data);
        message.reply(t(message.author.id, 'discountAdded'));
    }

    // استخدام كود خصم
    if (command === 'discount') {
        const code = args[0]?.toUpperCase();
        if (!code) return;

        const data = loadData();
        const discount = data.discounts[code];

        if (!discount) {
            return message.reply(t(message.author.id, 'discountInvalid'));
        }

        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            return message.reply(t(message.author.id, 'discountInvalid'));
        }

        if (data.discountRedemptions[message.author.id]) {
            return message.reply(t(message.author.id, 'discountUsed'));
        }

        data.discountRedemptions[message.author.id] = code;
        saveData(data);

        message.reply(
            t(message.author.id, 'discountApplied', { percent: discount.percent })
        );
    }

    // تغيير اللغة بالأمر
    if (command === 'lang') {
        const lang = args[0]?.toLowerCase();

        if (!lang || !['en', 'ar'].includes(lang)) {
            return message.reply('Usage: -lang en or -lang ar');
        }

        const data = loadData();
        data.userLanguages[message.author.id] = lang;
        saveData(data);

        message.reply(t(message.author.id, 'languageChanged'));
    }

    // عرض المخزون
    if (command === 'stock') {
        const data = loadData();
        const products = Object.values(data.products);

        if (products.length === 0) {
            return message.reply('❌ لا توجد منتجات حالياً.');
        }

        let msg = '📦 **حالة المخزون:**\n\n';

        products.forEach(p => {
            const stock = p.keys.filter(k => !k.used).length;

            let color = '🟩';
            if (stock < 5) color = '🟧';
            if (stock === 0) color = '🟥';

            msg += `${color} **${p.name}** — (${p.id})\n`;
            msg += `   🗝️ Keys: **${stock}**\n\n`;
        });

        return message.reply(msg);
    }

    // إرسال زر الشراء في روم معيّن
    if (command === 'sendshopbutton') {
        if (message.author.id !== process.env.OWNER_ID) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_shop')
                .setLabel('🛒 شراء منتج')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({
            content:
                '🛒 اضغط زر الشراء لعرض المنتجات واختيار طريقة الدفع.\n' +
                '🛒 Click the button below to browse products and choose your payment method.',
            components: [row]
        });
    }

    // إرسال رسالة اختيار اللغة بأزرار
    if (command === 'sendlang') {
        if (message.author.id !== process.env.OWNER_ID) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_lang_ar')
                .setLabel('العربية 🇸🇦')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_lang_en')
                .setLabel('English 🇺🇸')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({
            content:
                '🌐 اختر لغتك المفضلة / Choose your preferred language.\n' +
                'كل رسائل البوت القادمة ستكون بهذه اللغة.',
            components: [row]
        });
    }
});

// ====== الإنتراكشنات (منيو + أزرار + مودال) ======
client.on('interactionCreate', async (interaction) => {
    // ----- منيو اختيار المنتجات + الدفع -----
    if (interaction.isStringSelectMenu()) {
        // اختيار منتج
        if (interaction.customId === 'select_product') {
            const productId = interaction.values[0];
            const data = loadData();
            const product = data.products[productId];

            if (!product || product.keys.filter(k => !k.used).length === 0) {
                return interaction.reply({
                    content: t(interaction.user.id, 'noStock'),
                    ephemeral: true
                });
            }

            const lang = getLang(interaction.user.id);
            let paymentMethods;

            if (lang === 'ar') {
                paymentMethods = [
                    {
                        label: '💰 PayPal',
                        value: 'paypal',
                        description: 'الدفع عبر PayPal ثم إرسال صورة الإيصال في الخاص.'
                    },
                    {
                        label: '💳 STC Pay',
                        value: 'stc',
                        description: 'افتح تذكرة لتحصل على رقم التحويل ثم أرسل صورة الإيصال.'
                    },
                    {
                        label: '🚀 برق Barq',
                        value: 'barq',
                        description: 'افتح تذكرة لتحصل على رقم التحويل ثم أرسل صورة الإيصال.'
                    },
                    {
                        label: '🧺 Gift Card (Skine)',
                        value: 'giftcard',
                        description: 'بطاقة من https://skine.com/en-us/rewarble فقط.'
                    },
                    {
                        label: '🏦 التحويل البنكي',
                        value: 'bank',
                        description: 'تحويل إلى الآيبان ثم إرسال صورة الإيصال في الخاص.'
                    }
                ];
            } else {
                paymentMethods = [
                    {
                        label: '💰 PayPal',
                        value: 'paypal',
                        description: 'Pay via PayPal then DM payment screenshot.'
                    },
                    {
                        label: '💳 STC Pay',
                        value: 'stc',
                        description: 'Open ticket to get transfer number, then send receipt.'
                    },
                    {
                        label: '🚀 Barq',
                        value: 'barq',
                        description: 'Open ticket to get transfer number, then send receipt.'
                    },
                    {
                        label: '🧺 Gift Card (Skine)',
                        value: 'giftcard',
                        description: 'Card from https://skine.com/en-us/rewarble only.'
                    },
                    {
                        label: '🏦 Bank Transfer',
                        value: 'bank',
                        description: 'Transfer to IBAN then DM transfer screenshot.'
                    }
                ];
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_payment_${productId}`)
                    .setPlaceholder(t(interaction.user.id, 'selectPayment'))
                    .addOptions(paymentMethods)
            );

            await interaction.reply({
                content: t(interaction.user.id, 'selectPayment'),
                components: [row],
                ephemeral: true
            });
        }

        // اختيار طريقة الدفع
        if (interaction.customId.startsWith('select_payment_')) {
            const productId = interaction.customId.split('_')[2];
            const paymentMethod = interaction.values[0];
            const data = loadData();
            const product = data.products[productId];

            if (!product) {
                return interaction.reply({
                    content: t(interaction.user.id, 'productNotFound'),
                    ephemeral: true
                });
            }

            let price = product.price;
            const userDiscount = data.discountRedemptions[interaction.user.id];

            if (userDiscount && data.discounts[userDiscount]) {
                const discountPercent = data.discounts[userDiscount].percent;
                price = price - (price * discountPercent / 100);
            }

            const invoiceNumber = data.invoiceCounter++;

            data.orders[invoiceNumber] = {
                invoiceNumber,
                userId: interaction.user.id,
                productId,
                paymentMethod,
                originalPrice: product.price,
                finalPrice: price,
                discount: userDiscount || null,
                status: 'pending',
                timestamp: Date.now()
            };

            if (userDiscount) {
                data.discounts[userDiscount].usedCount++;
                delete data.discountRedemptions[interaction.user.id];
            }

            saveData(data);

            const lang = getLang(interaction.user.id);
            let paymentDetailsText = '';
            if (paymentMethod === 'stc' || paymentMethod === 'barq') {
                paymentDetailsText =
                    lang === 'ar'
                        ? translations.ar.payment_STC_BARQ
                        : translations.en.payment_STC_BARQ;
            } else if (paymentMethod === 'giftcard') {
                paymentDetailsText =
                    lang === 'ar'
                        ? translations.ar.payment_GIFTCARD
                        : translations.en.payment_GIFTCARD;
            } else if (paymentMethod === 'bank') {
                paymentDetailsText =
                    lang === 'ar'
                        ? translations.ar.payment_BANK
                        : translations.en.payment_BANK;
            } else if (paymentMethod === 'paypal') {
                paymentDetailsText =
                    lang === 'ar'
                        ? translations.ar.payment_PAYPAL
                        : translations.en.payment_PAYPAL;
            }

            const embed = new EmbedBuilder()
                .setTitle(t(interaction.user.id, 'invoiceTitle'))
                .setColor(0x00ae86)
                .addFields(
                    {
                        name: t(interaction.user.id, 'invoiceNumber'),
                        value: `#${invoiceNumber}`,
                        inline: true
                    },
                    {
                        name: t(interaction.user.id, 'product'),
                        value: product.name,
                        inline: true
                    },
                    {
                        name: t(interaction.user.id, 'price'),
                        value: `${price}`,
                        inline: true
                    },
                    {
                        name: t(interaction.user.id, 'paymentMethod'),
                        value: paymentMethod.toUpperCase(),
                        inline: true
                    },
                    {
                        name:
                            lang === 'ar'
                                ? translations.ar.paymentInstructionsTitle
                                : translations.en.paymentInstructionsTitle,
                        value: paymentDetailsText
                    }
                )
                .setFooter({
                    text:
                        lang === 'ar'
                            ? translations.ar.paymentNoteFooter
                            : translations.en.paymentNoteFooter
                })
                .setTimestamp();

            await interaction.user.send({ embeds: [embed] });
            await interaction.reply({
                content:
                    lang === 'ar'
                        ? '✅ تم إرسال الفاتورة وتعليمات الدفع إلى الخاص.'
                        : '✅ Invoice and payment instructions sent to your DM.',
                ephemeral: true
            });
        }
    }

    // ----- الأزرار -----
    if (interaction.isButton()) {
        const id = interaction.customId;

        // زر اختيار اللغة
        if (id === 'set_lang_ar' || id === 'set_lang_en') {
            const data = loadData();
            data.userLanguages[interaction.user.id] = id === 'set_lang_ar' ? 'ar' : 'en';
            saveData(data);

            await interaction.reply({
                content: t(interaction.user.id, 'languageChanged'),
                ephemeral: true
            });
            return;
        }

        // زر فتح المتجر (open_shop)
        if (id === 'open_shop') {
            const data = loadData();
            const products = Object.values(data.products);

            if (products.length === 0) {
                return interaction.reply({
                    content: t(interaction.user.id, 'noProducts'),
                    ephemeral: true
                });
            }

            const lang = getLang(interaction.user.id);

            const options = products.map((p) => ({
                label: `${p.name} - ${p.price}`,
                description:
                    lang === 'ar'
                        ? `المخزون: ${p.keys.filter((k) => !k.used).length}`
                        : `Stock: ${p.keys.filter((k) => !k.used).length}`,
                value: p.id
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_product')
                    .setPlaceholder(t(interaction.user.id, 'selectProduct'))
                    .addOptions(options)
            );

            await interaction.reply({
                content: t(interaction.user.id, 'shopSelectProduct'),
                components: [row],
                ephemeral: true
            });
            return;
        }

        // قبول الطلب من الخاص (الأزرار في DM مع المالك)
        if (id.startsWith('approve_')) {
            if (interaction.user.id !== process.env.OWNER_ID) return;

            const invoiceNumber = parseInt(id.split('_')[1]);
            const data = loadData();
            const order = data.orders[invoiceNumber];

            if (!order) return;

            const product = data.products[order.productId];
            const availableKey = product.keys.find((k) => !k.used);

            if (!availableKey) {
                return interaction.reply({
                    content: 'No keys available!',
                    ephemeral: true
                });
            }

            availableKey.used = true;
            order.status = 'completed';
            order.keyDelivered = availableKey.value;

            saveData(data);

            const buyer = await client.users.fetch(order.userId);
            await buyer.send(
                t(order.userId, 'orderApproved') + `\n\`\`\`${availableKey.value}\`\`\``
            );

            // ✅ هنا نعطيه رتبة Customer بعد استلام المفتاح
            await giveCustomerRole(order.userId);

            await interaction.update({
                content: `✅ Order #${invoiceNumber} approved and key delivered.`,
                components: []
            });

            sendReviewRequest(buyer, order, product);
            return;
        }

        // رفض الطلب
        if (id.startsWith('reject_')) {
            if (interaction.user.id !== process.env.OWNER_ID) return;

            const invoiceNumber = parseInt(id.split('_')[1]);
            const data = loadData();
            const order = data.orders[invoiceNumber];

            if (!order) return;

            order.status = 'rejected';

            if (order.discount) {
                data.discountRedemptions[order.userId] = order.discount;
                data.discounts[order.discount].usedCount--;
            }

            saveData(data);

            const buyer = await client.users.fetch(order.userId);
            await buyer.send(t(order.userId, 'orderRejected'));

            await interaction.update({
                content: `❌ Order #${invoiceNumber} rejected.`,
                components: []
            });
            return;
        }

        // زر التقييم (يفتح مودال)
        if (id.startsWith('rate_')) {
            const [_, rating, invoiceNumber] = id.split('_');

            const modal = new ModalBuilder()
                .setCustomId(`review_${rating}_${invoiceNumber}`)
                .setTitle(`Review - ${rating} Star${rating > 1 ? 's' : ''}`);

            const commentInput = new TextInputBuilder()
                .setCustomId('comment')
                .setLabel('Comment (optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const row = new ActionRowBuilder().addComponents(commentInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }
    }

    // ----- مودال التقييم -----
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('review_')) {
            const [_, rating, invoiceNumber] = interaction.customId.split('_');
            const comment =
                interaction.fields.getTextInputValue('comment') || 'No comment';

            const data = loadData();
            const order = data.orders[invoiceNumber];
            const product = data.products[order.productId];

            const review = {
                userId: interaction.user.id,
                productId: order.productId,
                rating: parseInt(rating),
                comment,
                timestamp: Date.now()
            };

            data.reviews.push(review);
            saveData(data);

            await interaction.reply({
                content: t(interaction.user.id, 'reviewReceived'),
                ephemeral: true
            });

            const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
            const stars = '⭐'.repeat(parseInt(rating));

            const reviewEmbed = new EmbedBuilder()
                .setTitle(`${stars} (${rating}/5)`)
                .setColor(0xffd700)
                .addFields(
                    {
                        name: t(interaction.user.id, 'customer'),
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: t(interaction.user.id, 'product'),
                        value: `${product.name} — ${order.finalPrice}`,
                        inline: true
                    },
                    {
                        name: t(interaction.user.id, 'comment'),
                        value: comment
                    }
                )
                .setTimestamp();

            await reviewChannel.send({ embeds: [reviewEmbed] });
        }
    }
});

// ====== دوال مساعدة للـ DM ======
async function handleDMProof(message) {
    const data = loadData();
    const userOrders = Object.values(data.orders).filter(
        (o) => o.userId === message.author.id && o.status === 'pending'
    );

    if (userOrders.length === 0) return;

    const order = userOrders[userOrders.length - 1];
    const product = data.products[order.productId];

    const owner = await client.users.fetch(process.env.OWNER_ID);

    const embed = new EmbedBuilder()
        .setTitle(t(owner.id, 'orderPending'))
        .setColor(0xff9900)
        .addFields(
            { name: 'Invoice', value: `#${order.invoiceNumber}`, inline: true },
            { name: 'Customer', value: `<@${message.author.id}>`, inline: true },
            { name: 'Product', value: product.name, inline: true },
            { name: 'Price', value: `${order.finalPrice}`, inline: true },
            {
                name: 'Payment Method',
                value: order.paymentMethod.toUpperCase(),
                inline: true
            }
        )
        .setDescription(
            `**Payment Proof:**\n${message.content || 'See attachment'}`
        )
        .setTimestamp();

    if (message.attachments.size > 0) {
        embed.setImage(message.attachments.first().url);
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve_${order.invoiceNumber}`)
            .setLabel(t(owner.id, 'approveOrder'))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject_${order.invoiceNumber}`)
            .setLabel(t(owner.id, 'rejectOrder'))
            .setStyle(ButtonStyle.Danger)
    );

    await owner.send({ embeds: [embed], components: [row] });
    await message.reply(t(message.author.id, 'proofReceived'));
}

async function sendReviewRequest(user, order, product) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rate_1_${order.invoiceNumber}`)
            .setLabel('⭐ 1')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`rate_2_${order.invoiceNumber}`)
            .setLabel('⭐⭐ 2')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`rate_3_${order.invoiceNumber}`)
            .setLabel('⭐⭐⭐ 3')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`rate_4_${order.invoiceNumber}`)
            .setLabel('⭐⭐⭐⭐ 4')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`rate_5_${order.invoiceNumber}`)
            .setLabel('⭐⭐⭐⭐⭐ 5')
            .setStyle(ButtonStyle.Primary)
    );

    await user.send({
        content: t(user.id, 'rateExperience'),
        components: [row]
    });
}

// ====== Dashboard (Express) ======
const app = express();
app.use(express.json());

// سيشنات الأدمن في الذاكرة
const adminSessions = {};

function createToken() {
    return crypto.randomBytes(24).toString('hex');
}

// صفحة HTML بسيطة للوحة التحكم
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>P9 Shop Admin Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:#020617; color:#e5e7eb; }
  .app { min-height:100vh; padding:16px; background:#020617; }
  .card { background:#020617; border-radius:14px; padding:16px 20px; box-shadow:0 18px 40px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.15); }
  .login-wrap { max-width:520px; margin:40px auto; }
  h1 { font-size:22px; font-weight:700; margin-bottom:6px; }
  p { font-size:13px; color:#9ca3af; }
  input, button { font-family:inherit; }
  input[type=password] {
    width:100%; margin-top:10px; padding:8px 10px; border-radius:8px; border:1px solid #4b5563;
    background:#020617; color:#e5e7eb; outline:none;
  }
  input[type=password]:focus { border-color:#0ea5e9; }
  .btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 14px; border-radius:999px; border:none; cursor:pointer; font-size:13px; font-weight:500; }
  .btn-primary { background:#06b6d4; color:#0f172a; }
  .btn-primary:hover { background:#0ea5e9; }
  .btn-ghost { background:transparent; border:1px solid #4b5563; color:#e5e7eb; }
  .btn-ghost:hover { border-color:#9ca3af; }
  .btn-danger { background:#ef4444; color:#0b0f19; }
  .btn-danger:hover { background:#f97373; }
  .mt8 { margin-top:8px; }
  .mt12 { margin-top:12px; }
  .mt16 { margin-top:16px; }
  .text-sm { font-size:13px; }
  .status-ok { color:#22c55e; }
  .status-bad { color:#ef4444; }
  .hidden { display:none !important; }

  .layout { display:flex; gap:18px; margin-top:24px; }
  .sidebar { width:230px; background:#020617; border-radius:14px; padding:14px 12px; box-shadow:0 18px 40px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.2); }
  .sidebar-title { font-size:18px; font-weight:700; margin-bottom:12px; }
  .nav-btn { width:100%; display:flex; align-items:center; gap:8px; padding:8px 10px; margin-bottom:6px; border-radius:10px; border:none; background:transparent; color:#e5e7eb; font-size:13px; cursor:pointer; text-align:left; }
  .nav-btn span.icon { font-size:16px; }
  .nav-btn.active { background:rgba(15,23,42,0.95); box-shadow:0 0 0 1px rgba(56,189,248,0.7); }
  .nav-footer { margin-top:14px; border-top:1px solid #1f2937; padding-top:10px; font-size:11px; color:#9ca3af; }

  .main { flex:1; min-width:0; }
  .main-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .main-header h2 { font-size:20px; font-weight:700; }
  .main-header-right { display:flex; align-items:center; gap:8px; font-size:12px; color:#9ca3af; }

  .views { }
  .view { display:none; }
  .view.active { display:block; }

  .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:10px; }
  .stat-card h3 { font-size:13px; color:#9ca3af; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.08em; }
  .stat-card .value { font-size:26px; font-weight:700; margin-top:2px; }

  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }
  th, td { padding:8px 10px; border-bottom:1px solid #111827; }
  th { background:#020617; color:#9ca3af; font-weight:500; text-align:left; }
  tr:hover td { background:#020617; }

  .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:11px; }
  .tag-pending { background:#f97316; color:#111827; }
  .tag-completed { background:#22c55e; color:#052e16; }
  .tag-rejected { background:#ef4444; color:#450a0a; }

  .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:8px; }
  .field { margin-bottom:8px; font-size:13px; }
  .field label { display:block; margin-bottom:4px; color:#9ca3af; }
  .field input, .field textarea { width:100%; padding:7px 8px; border-radius:8px; border:1px solid #4b5563; background:#020617; color:#e5e7eb; font-size:13px; }
  .field textarea { min-height:80px; resize:vertical; }

  .card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin-top:10px; }
  .pill { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:11px; background:#111827; color:#e5e7eb; }
  .stars { color:#facc15; font-size:14px; margin-bottom:4px; }
  .small { font-size:11px; color:#9ca3af; }

  @media (max-width:900px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; display:flex; overflow-x:auto; }
    .nav-btn { flex:1; white-space:nowrap; }
  }
</style>
</head>
<body>
<div class="app">
  <div id="loginView" class="login-wrap card">
    <h1>Shop Admin Dashboard</h1>
    <p>Login using <code>ADMIN_PASSWORD</code>.</p>
    <div class="mt12">
      <input type="password" id="pwInput" placeholder="Admin password" />
    </div>
    <div class="mt12">
      <button class="btn btn-primary" onclick="login()">Login</button>
      <button class="btn btn-ghost mt8" type="button" onclick="checkHealth()">Check Backend</button>
    </div>
    <div class="mt12 text-sm" id="loginStatus">Status: <span class="status-bad">Logged out</span></div>
    <div class="mt8 text-sm" id="apiInfo"></div>
  </div>

  <div id="adminLayout" class="layout hidden">
    <aside class="sidebar">
      <div class="sidebar-title">Admin</div>
      <button class="nav-btn active" data-view="stats" onclick="setView('stats')"><span class="icon">📊</span><span>Stats</span></button>
      <button class="nav-btn" data-view="products" onclick="setView('products')"><span class="icon">📦</span><span>Products</span></button>
      <button class="nav-btn" data-view="orders" onclick="setView('orders')"><span class="icon">🧾</span><span>Orders</span></button>
      <button class="nav-btn" data-view="reviews" onclick="setView('reviews')"><span class="icon">⭐</span><span>Reviews</span></button>
      <button class="nav-btn" data-view="discounts" onclick="setView('discounts')"><span class="icon">🎟️</span><span>Discounts</span></button>
      <div class="mt12">
        <button class="btn btn-primary" style="width:100%;" onclick="refreshCurrent()">Refresh</button>
      </div>
      <div class="mt8">
        <button class="btn btn-danger" style="width:100%;" onclick="logout()">Logout</button>
      </div>
      <div class="nav-footer" id="sidebarStatus">Status: OK</div>
    </aside>

    <main class="main">
      <div class="card">
        <div class="main-header">
          <h2 id="viewTitle">Stats</h2>
          <div class="main-header-right">
            <span id="lastUpdated">–</span>
          </div>
        </div>
        <div class="views">
          <section id="view-stats" class="view active">
            <div class="stat-grid">
              <div class="card stat-card">
                <h3>Total Products</h3>
                <div class="value" id="statProducts">-</div>
              </div>
              <div class="card stat-card">
                <h3>Total Keys</h3>
                <div class="value" id="statKeys">-</div>
              </div>
              <div class="card stat-card">
                <h3>Orders</h3>
                <div class="value" id="statOrders">-</div>
              </div>
              <div class="card stat-card">
                <h3>Reviews</h3>
                <div class="value" id="statReviews">-</div>
              </div>
            </div>
          </section>

          <section id="view-products" class="view">
            <div class="form-grid">
              <div class="card">
                <h3>Add Product</h3>
                <div class="field mt8">
                  <label>Product ID</label>
                  <input id="p_id" />
                </div>
                <div class="field">
                  <label>Name</label>
                  <input id="p_name" />
                </div>
                <div class="field">
                  <label>Price</label>
                  <input id="p_price" type="number" step="0.01" />
                </div>
                <button class="btn btn-primary mt8" onclick="addProduct()">Add Product</button>
              </div>
              <div class="card">
                <h3>Add Keys</h3>
                <div class="field mt8">
                  <label>Product ID</label>
                  <input id="k_pid" />
                </div>
                <div class="field">
                  <label>Keys (one per line)</label>
                  <textarea id="k_values" placeholder="KEY-1&#10;KEY-2&#10;KEY-3"></textarea>
                </div>
                <button class="btn btn-primary mt8" onclick="addKeys()">Add Keys</button>
              </div>
            </div>
            <div class="card mt16">
              <h3>Products</h3>
              <table id="productsTable">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section id="view-orders" class="view">
            <div class="card">
              <h3>Recent Orders</h3>
              <table id="ordersTable">
                <thead>
                  <tr><th>Invoice</th><th>User</th><th>Product</th><th>Price</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section id="view-reviews" class="view">
            <div class="card">
              <h3>Latest Reviews</h3>
              <div id="reviewsContainer" class="card-grid mt8"></div>
            </div>
          </section>

          <section id="view-discounts" class="view">
            <div class="card">
              <h3>Discount Codes</h3>
              <div class="form-grid mt8">
                <div>
                  <div class="field">
                    <label>Code</label>
                    <input id="d_code" placeholder="SUMMER20" />
                  </div>
                </div>
                <div>
                  <div class="field">
                    <label>Percent</label>
                    <input id="d_percent" type="number" step="1" placeholder="20" />
                  </div>
                </div>
                <div>
                  <div class="field">
                    <label>Max Uses (optional)</label>
                    <input id="d_maxUses" type="number" placeholder="e.g. 50" />
                  </div>
                </div>
              </div>
              <button class="btn btn-primary mt8" onclick="createDiscount()">Add Discount Code</button>

              <div id="discountsContainer" class="card-grid mt16"></div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</div>

<script>
let token = null;
let currentView = 'stats';

document.addEventListener('DOMContentLoaded', function () {
  var apiInfo = document.getElementById('apiInfo');
  apiInfo.textContent = 'Backend API: ' + window.location.origin;
});

function checkHealth() {
  fetch('/api/health')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(() => {
      setLoginStatus('Backend OK', true);
    })
    .catch(() => {
      setLoginStatus('Backend not responding', false);
    });
}

function setLoginStatus(msg, ok) {
  var el = document.getElementById('loginStatus');
  el.innerHTML = 'Status: <span class="' + (ok ? 'status-ok' : 'status-bad') + '">' + msg + '</span>';
}

async function login() {
  var pw = document.getElementById('pwInput').value;
  if (!pw) {
    setLoginStatus('Enter password first', false);
    return;
  }
  try {
    const res = await fetch('/api/admin/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) {
      setLoginStatus('Invalid password', false);
      return;
    }
    const data = await res.json();
    token = data.token;
    setLoginStatus('Logged in', true);
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('adminLayout').classList.remove('hidden');
    setView('stats');
  } catch (e) {
    console.error(e);
    setLoginStatus('Login error', false);
  }
}

function logout() {
  token = null;
  document.getElementById('adminLayout').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  setLoginStatus('Logged out', false);
}

function setView(view) {
  currentView = view;
  document.getElementById('viewTitle').textContent =
    view === 'stats' ? 'Stats' :
    view === 'products' ? 'Products' :
    view === 'orders' ? 'Orders' :
    view === 'reviews' ? 'Reviews' :
    view === 'discounts' ? 'Discounts' : view;

  var views = document.querySelectorAll('.view');
  views.forEach(v => v.classList.remove('active'));
  var active = document.getElementById('view-' + view);
  if (active) active.classList.add('active');

  var btns = document.querySelectorAll('.nav-btn');
  btns.forEach(b => b.classList.remove('active'));
  var btn = document.querySelector('.nav-btn[data-view="' + view + '"]');
  if (btn) btn.classList.add('active');

  updateTimestamp();
  if (view === 'stats') loadStats();
  if (view === 'products') { loadProducts(); }
  if (view === 'orders') loadOrders();
  if (view === 'reviews') loadReviews();
  if (view === 'discounts') loadDiscounts();
}

function refreshCurrent() {
  setView(currentView);
}

function updateTimestamp() {
  var d = new Date();
  document.getElementById('lastUpdated').textContent = 'Last refresh: ' + d.toLocaleString();
}

async function authedFetch(url, options) {
  if (!token) throw new Error('Not logged in');
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, options);
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('statProducts').textContent = s.totalProducts;
    document.getElementById('statKeys').textContent = s.totalKeys;
    document.getElementById('statOrders').textContent = s.totalOrders;
    document.getElementById('statReviews').textContent = s.totalReviews || 0;
  } catch (e) {
    console.error(e);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    products.forEach(p => {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + p.id + '</td>' +
        '<td>' + p.name + '</td>' +
        '<td>' + p.price + '</td>' +
        '<td>' + p.stock + '</td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

async function addProduct() {
  if (!token) return alert('Login first');
  var id = document.getElementById('p_id').value.trim();
  var name = document.getElementById('p_name').value.trim();
  var price = parseFloat(document.getElementById('p_price').value);
  if (!id || !name || isNaN(price)) {
    alert('Fill product fields');
    return;
  }
  try {
    const res = await authedFetch('/api/products', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:id, name:name, price:price })
    });
    if (!res.ok) {
      alert('Error adding product');
      return;
    }
    document.getElementById('p_id').value = '';
    document.getElementById('p_name').value = '';
    document.getElementById('p_price').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addKeys() {
  if (!token) return alert('Login first');
  var pid = document.getElementById('k_pid').value.trim();
  var raw = document.getElementById('k_values').value.trim();
  if (!pid || !raw) {
    alert('Fill product id and keys');
    return;
  }
  var keys = raw.split('\\n').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!keys.length) {
    alert('No keys provided');
    return;
  }
  try {
    const res = await authedFetch('/api/products/' + encodeURIComponent(pid) + '/keys', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ keys: keys })
    });
    if (!res.ok) {
      alert('Error adding keys');
      return;
    }
    document.getElementById('k_pid').value = '';
    document.getElementById('k_values').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function loadOrders() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/orders/recent');
    const orders = await res.json();
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';
    orders.forEach(o => {
      var tr = document.createElement('tr');
      var statusClass =
        o.status === 'completed' ? 'tag tag-completed' :
        o.status === 'rejected' ? 'tag tag-rejected' :
        'tag tag-pending';
      var actions = '';
      if (o.status === 'pending') {
        actions =
          '<button class="btn btn-primary" style="padding:4px 10px;font-size:11px;margin-right:4px;" onclick="acceptOrder(' + o.invoiceNumber + ')">Accept</button>' +
          '<button class="btn btn-danger" style="padding:4px 10px;font-size:11px;" onclick="rejectOrder(' + o.invoiceNumber + ')">Reject</button>';
      }
      tr.innerHTML =
        '<td>#' + o.invoiceNumber + '</td>' +
        '<td>' + o.userId + '</td>' +
        '<td>' + (o.productName || o.productId) + '</td>' +
        '<td>' + o.finalPrice + '</td>' +
        '<td><span class="' + statusClass + '">' + o.status + '</span></td>' +
        '<td>' + actions + '</td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

async function acceptOrder(inv) {
  if (!token) return;
  if (!confirm('Accept order #' + inv + '?')) return;
  try {
    const res = await authedFetch('/api/orders/' + inv + '/accept', { method:'POST' });
    if (!res.ok) {
      alert('Error accepting order');
      return;
    }
    loadOrders();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function rejectOrder(inv) {
  if (!token) return;
  if (!confirm('Reject order #' + inv + '?')) return;
  try {
    const res = await authedFetch('/api/orders/' + inv + '/reject', { method:'POST' });
    if (!res.ok) {
      alert('Error rejecting order');
      return;
    }
    loadOrders();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function loadReviews() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/reviews');
    const reviews = await res.json();
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '';
    if (!reviews.length) {
      container.innerHTML = '<div class="small">No reviews yet.</div>';
      return;
    }
    reviews.forEach(r => {
      var card = document.createElement('div');
      card.className = 'card';
      var stars = '';
      for (var i=0;i<r.rating;i++) stars += '⭐';
      card.innerHTML =
        '<div class="stars">' + stars + ' (' + r.rating + '/5)</div>' +
        '<div class="small">User: ' + r.userId + '</div>' +
        '<div class="small">Product: ' + (r.productName || r.productId) + '</div>' +
        '<div class="mt8 text-sm">' + (r.comment || 'No comment') + '</div>' +
        '<div class="small mt8">' + new Date(r.timestamp).toLocaleString() + '</div>';
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadDiscounts() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/discounts');
    const discounts = await res.json();
    const container = document.getElementById('discountsContainer');
    container.innerHTML = '';
    if (!discounts.length) {
      container.innerHTML = '<div class="small">No discount codes.</div>';
      return;
    }
    discounts.forEach(d => {
      var card = document.createElement('div');
      card.className = 'card';
      var usesText = d.maxUses
        ? (d.usedCount + ' / ' + d.maxUses + ' uses')
        : (d.usedCount + ' uses');
      card.innerHTML =
        '<div class="pill">Code: ' + d.code + '</div>' +
        '<div class="mt8 text-sm">Percent: ' + d.percent + '%</div>' +
        '<div class="small mt4">' + usesText + '</div>' +
        '<button class="btn btn-danger mt8" style="padding:4px 10px;font-size:11px;" onclick="deleteDiscount(\\'' + d.code + '\\')">Delete</button>';
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function createDiscount() {
  if (!token) return alert('Login first');
  var code = document.getElementById('d_code').value.trim();
  var percent = parseFloat(document.getElementById('d_percent').value);
  var maxUsesRaw = document.getElementById('d_maxUses').value.trim();
  var maxUses = maxUsesRaw ? parseInt(maxUsesRaw) : null;

  if (!code || isNaN(percent)) {
    alert('Fill code and percent');
    return;
  }
  try {
    const res = await authedFetch('/api/discounts', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code:code, percent:percent, maxUses:maxUses })
    });
    if (!res.ok) {
      alert('Error creating discount');
      return;
    }
    document.getElementById('d_code').value = '';
    document.getElementById('d_percent').value = '';
    document.getElementById('d_maxUses').value = '';
    loadDiscounts();
  } catch (e) {
    console.error(e);
  }
}

async function deleteDiscount(code) {
  if (!token) return;
  if (!confirm('Delete discount code ' + code + '?')) return;
  try {
    const res = await authedFetch('/api/discounts/' + encodeURIComponent(code), { method:'DELETE' });
    if (!res.ok) {
      alert('Error deleting discount');
      return;
    }
    loadDiscounts();
  } catch (e) {
    console.error(e);
  }
}
</script>
</body>
</html>`);
});

// ====== REST API للدashboard ======

app.post('/api/admin/login', (req, res) => {
    const pw = (req.body && req.body.password) || '';
    if (!pw || !pw === ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'invalid_password' });
    }
    const token = createToken();
    adminSessions[token] = {
        createdAt: Date.now()
    };
    res.json({ token });
});

function adminAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token || !adminSessions[token]) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}

app.get('/api/stats', (req, res) => {
    const data = loadData();
    const totalProducts = Object.keys(data.products).length;
    let totalKeys = 0;
    Object.values(data.products).forEach((p) => {
        totalKeys += (p.keys || []).filter((k) => !k.used).length;
    });
    const totalOrders = Object.keys(data.orders).length;
    const totalReviews = data.reviews.length;
    res.json({ totalProducts, totalKeys, totalOrders, totalReviews });
});

app.get('/api/reviews', adminAuth, (req, res) => {
    const data = loadData();
    const reviews = (data.reviews || [])
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((r) => {
            const product = data.products[r.productId];
            return {
                userId: r.userId,
                productId: r.productId,
                productName: product ? product.name : r.productId,
                rating: r.rating,
                comment: r.comment,
                timestamp: r.timestamp
            };
        });
    res.json(reviews);
});

app.get('/api/discounts', adminAuth, (req, res) => {
    const data = loadData();
    const arr = Object.entries(data.discounts || {}).map(([code, info]) => ({
        code,
        percent: info.percent,
        usedCount: info.usedCount || 0,
        maxUses: info.maxUses || null
    }));
    res.json(arr);
});

app.post('/api/discounts', adminAuth, (req, res) => {
    const body = req.body || {};
    const code = body.code ? String(body.code).toUpperCase() : null;
    const percent =
        typeof body.percent === 'number' ? body.percent : Number(body.percent);
    const maxUses = body.maxUses != null ? Number(body.maxUses) : null;

    if (!code || isNaN(percent)) {
        return res.status(400).json({ error: 'missing_fields' });
    }

    const data = loadData();
    data.discounts = data.discounts || {};
    const existing = data.discounts[code];
    data.discounts[code] = {
        percent,
        maxUses: isNaN(maxUses) ? null : maxUses,
        usedCount:
            existing && typeof existing.usedCount === 'number'
                ? existing.usedCount
                : 0
    };
    saveData(data);
    res.json({ ok: true });
});

app.delete('/api/discounts/:code', adminAuth, (req, res) => {
    const code = String(req.params.code || '').toUpperCase();
    const data = loadData();
    if (!data.discounts || !data.discounts[code]) {
        return res.status(404).json({ error: 'not_found' });
    }
    delete data.discounts[code];

    if (data.discountRedemptions) {
        Object.keys(data.discountRedemptions).forEach((uid) => {
            if (data.discountRedemptions[uid] === code) {
                delete data.discountRedemptions[uid];
            }
        });
    }

    saveData(data);
    res.json({ ok: true });
});

app.get('/api/products', (req, res) => {
    const data = loadData();
    const arr = Object.values(data.products).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: (p.keys || []).filter((k) => !k.used).length
    }));
    res.json(arr);
});

app.post('/api/products', adminAuth, (req, res) => {
    const { id, name, price } = req.body || {};
    if (!id || !name || typeof price !== 'number') {
        return res.status(400).json({ error: 'missing_fields' });
    }
    const data = loadData();
    data.products[id] = data.products[id] || { id, keys: [] };
    data.products[id].name = name;
    data.products[id].price = price;
    saveData(data);
    res.json({ ok: true });
});

app.post('/api/products/:id/keys', adminAuth, (req, res) => {
    const pid = req.params.id;
    const { keys } = req.body || {};
    if (!Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ error: 'keys_required' });
    }
    const data = loadData();
    const prod = data.products[pid];
    if (!prod) return res.status(404).json({ error: 'product_not_found' });
    prod.keys = prod.keys || [];
    keys.forEach((k) => {
        prod.keys.push({ value: k, used: false });
    });
    saveData(data);
    res.json({ ok: true, added: keys.length });
});

app.get('/api/orders/recent', adminAuth, (req, res) => {
    const data = loadData();
    const arr = Object.values(data.orders)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 200);
    arr.forEach((o) => {
        const p = data.products[o.productId];
        if (p) o.productName = p.name;
    });
    res.json(arr);
});

app.post('/api/orders/:invoice/accept', adminAuth, async (req, res) => {
    const invoice = parseInt(req.params.invoice);
    const data = loadData();
    const order = data.orders[invoice];
    if (!order) return res.status(404).json({ error: 'order_not_found' });
    if (order.status !== 'pending')
        return res.status(400).json({ error: 'invalid_status' });

    const product = data.products[order.productId];
    if (!product) return res.status(404).json({ error: 'product_not_found' });

    const availableKey = (product.keys || []).find((k) => !k.used);
    if (!availableKey) return res.status(400).json({ error: 'no_keys' });

    availableKey.used = true;
    order.status = 'completed';
    order.keyDelivered = availableKey.value;
    saveData(data);

    try {
        const buyer = await client.users.fetch(order.userId);
        await buyer.send(
            t(order.userId, 'orderApproved') + `\n\`\`\`${availableKey.value}\`\`\``
        );
        await sendReviewRequest(buyer, order, product);
    } catch (e) {
        console.error('Failed to DM buyer on accept:', e);
    }

    // ✅ إعطاء رتبة Customer من لوحة التحكم بعد القبول
    try {
        await giveCustomerRole(order.userId);
    } catch (e) {
        console.error('Failed to give Customer role from dashboard:', e);
    }

    res.json({ ok: true });
});

app.post('/api/orders/:invoice/reject', adminAuth, async (req, res) => {
    const invoice = parseInt(req.params.invoice);
    const data = loadData();
    const order = data.orders[invoice];
    if (!order) return res.status(404).json({ error: 'order_not_found' });

    order.status = 'rejected';

    if (order.discount) {
        data.discountRedemptions[order.userId] = order.discount;
        if (data.discounts[order.discount]) {
            data.discounts[order.discount].usedCount =
                (data.discounts[order.discount].usedCount || 1) - 1;
            if (data.discounts[order.discount].usedCount < 0) {
                data.discounts[order.discount].usedCount = 0;
            }
        }
    }

    saveData(data);

    try {
        const buyer = await client.users.fetch(order.userId);
        await buyer.send(t(order.userId, 'orderRejected'));
    } catch (e) {
        console.error('Failed to DM buyer on reject:', e);
    }

    res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});

// KeepAlive بسيط
const app2 = express();
app2.get('/', (req, res) => res.send('Bot is alive'));
app2.listen(3000, () => console.log('🌐 KeepAlive server running on port 3000'));

// تشغيل السيرفر الأساسي
app.listen(PORT, () => {
    console.log(`🌐 Dashboard listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);