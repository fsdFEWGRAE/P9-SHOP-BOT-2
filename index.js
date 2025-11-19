// =============================================
// ===============  P9 SHOP BOT  ===============
// =============================================

// =========== Imports ===========
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
} = require("discord.js");

const fs = require("fs");
const express = require("express");
const crypto = require("crypto");

// =========== Discord Client ===========
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const app = express();
app.use(express.json());

// =========== Config ===========
const PREFIX = "-";
const REVIEW_CHANNEL_ID = "1438169825489719326";

const OWNER_ID = process.env.OWNER_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PORT = process.env.PORT || 3000;

// =========== Translations ===========
const translations = {
    en: {
        productAdded: "Product added successfully!",
        keyAdded: "Key added successfully!",
        productNotFound: "Product not found!",
        selectProduct: "Select a product:",
        selectPlan: "Select subscription duration:",
        selectPayment: "Choose payment method:",
        noProducts: "No products available!",
        noStock: "This product has no keys left!",
        invoiceTitle: "Payment Invoice",
        sendProof: "Please send payment proof here.",
        orderApproved: "Your order has been approved! Here is your key:",
        orderRejected: "Your order was rejected.",
        rateExperience: "Please rate your experience!",
        reviewReceived: "Thanks for your review!",
        languageChanged: "Language changed successfully!"
    },
    ar: {
        productAdded: "تم إضافة المنتج بنجاح!",
        keyAdded: "تم إضافة المفتاح بنجاح!",
        productNotFound: "المنتج غير موجود!",
        selectProduct: "اختر منتج:",
        selectPlan: "اختر المدة:",
        selectPayment: "اختر وسيلة الدفع:",
        noProducts: "لا توجد منتجات!",
        noStock: "هذا المنتج لا يحتوي على مفاتيح!",
        invoiceTitle: "فاتورة الدفع",
        sendProof: "أرسل إثبات الدفع هنا.",
        orderApproved: "تمت الموافقة على طلبك! هذا مفتاحك:",
        orderRejected: "تم رفض طلبك.",
        rateExperience: "يرجى تقييم تجربتك!",
        reviewReceived: "شكراً على التقييم!",
        languageChanged: "تم تغيير اللغة!"
    }
};

// =========== Load Data ===========
function loadData() {
    try {
        let raw = fs.readFileSync("data.json", "utf8");
        return JSON.parse(raw);
    } catch (e) {
        return {
            products: {},        // المنتج الأساسي
            plans: {},           // الفترات لكل منتج
            orders: {},
            reviews: [],
            userLanguages: {},
            discounts: {},
            discountRedemptions: {},
            invoiceCounter: 1000
        };
    }
}

// =========== Save Data ===========
function saveData(data) {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

// =========== Lang Helper ===========
function getLang(userId) {
    const data = loadData();
    return data.userLanguages[userId] || "ar";
}

function t(userId, key) {
    const lang = getLang(userId);
    return translations[lang][key] || translations["en"][key] || key;
}

// =========== Console Ready ===========
client.once("ready", () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
});
// =============================================
// ============ BOT MESSAGE COMMANDS ===========
// =============================================

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // -------------- Language Button (Public) --------------
    if (message.content === "-sendlang") {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("lang_ar")
                    .setLabel("العربية 🇸🇦")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("lang_en")
                    .setLabel("English 🇬🇧")
                    .setStyle(ButtonStyle.Secondary)
            );

        return message.channel.send({
            content: "اختر لغتك / Choose your language:",
            components: [row]
        });
    }

    // -------------- Send Shop Button --------------
    if (message.content === "-sendshop") {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("open_shop")
                    .setLabel("🛒 فتح المتجر | Open Shop")
                    .setStyle(ButtonStyle.Success)
            );

        return message.channel.send({
            content: "اضغط لفتح قائمة المتجر:",
            components: [row]
        });
    }

    // -------------- PREFIX COMMANDS --------------
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    // --- ADD PRODUCT ---
    if (command === "addproduct") {
        if (message.author.id !== OWNER_ID)
            return message.reply("❌ أنت لست المالك");

        const parts = args.join(" ").split("|").map(p => p.trim());
        if (parts.length < 2)
            return message.reply("❌ استخدم: -addproduct id | name");

        const [id, name] = parts;
        const data = loadData();

        if (!data.products[id]) {
            data.products[id] = {
                id,
                name,
                plans: [] // الفترات مثل: 1day, 3days, week
            };
        }

        saveData(data);
        return message.reply("✅ تم إضافة المنتج!");
    }

    // --- ADD PLAN ---
    if (command === "addplan") {
        if (message.author.id !== OWNER_ID)
            return message.reply("❌ أنت لست المالك");

        const parts = args.join(" ").split("|").map(p => p.trim());
        if (parts.length < 3)
            return message.reply("❌ استخدم: -addplan productId | planId | name");

        const [pid, planId, planName] = parts;
        const data = loadData();

        if (!data.products[pid])
            return message.reply("❌ المنتج غير موجود");

        data.products[pid].plans.push({
            id: planId,
            name: planName,
            keys: []
        });

        saveData(data);
        return message.reply("✅ تمت إضافة الفترة!");
    }

    // --- ADD KEY TO PLAN ---
    if (command === "addkey") {
        if (message.author.id !== OWNER_ID)
            return message.reply("❌ غير مصرح");

        const parts = args.join(" ").split("|").map(p => p.trim());
        if (parts.length < 3)
            return message.reply("❌ استخدم: -addkey productId | planId | keyValue");

        const [pid, planId, keyValue] = parts;
        const data = loadData();

        const product = data.products[pid];
        if (!product) return message.reply("❌ المنتج غير موجود");

        const plan = product.plans.find(p => p.id === planId);
        if (!plan) return message.reply("❌ الفترة غير موجودة");

        plan.keys.push({ value: keyValue, used: false });
        saveData(data);

        return message.reply("🔑 تم إضافة المفتاح!");
    }
});


// =============================================
// ========= INTERACTIONS (BUTTONS / MENUS) =====
// =============================================

client.on("interactionCreate", async (interaction) => {
    const data = loadData();

    // -------------- LANGUAGE SELECTION --------------
    if (interaction.isButton()) {
        if (interaction.customId === "lang_ar") {
            data.userLanguages[interaction.user.id] = "ar";
            saveData(data);
            return interaction.reply({ content: "تم تغيير اللغة 🇸🇦", ephemeral: true });
        }
        if (interaction.customId === "lang_en") {
            data.userLanguages[interaction.user.id] = "en";
            saveData(data);
            return interaction.reply({ content: "Language updated 🇬🇧", ephemeral: true });
        }
    }

    // -------------- OPEN SHOP --------------
    if (interaction.customId === "open_shop") {
        const products = Object.values(data.products);

        if (products.length === 0)
            return interaction.reply({ content: t(interaction.user.id, "noProducts"), ephemeral: true });

        const options = products.map(p => ({
            label: p.name,
            value: p.id
        }));

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("select_product")
                .setPlaceholder(t(interaction.user.id, "selectProduct"))
                .addOptions(options)
        );

        return interaction.reply({
            content: t(interaction.user.id, "selectProduct"),
            components: [row],
            ephemeral: true
        });
    }

    // -------------- SELECT PRODUCT --------------
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select_product") {
            const pid = interaction.values[0];
            const product = data.products[pid];

            const plans = product.plans;
            if (!plans.length)
                return interaction.reply({ content: "❌ المنتج لا يحتوي على فترات!", ephemeral: true });

            const options = plans.map(pl => ({
                label: pl.name,
                value: `${pid}|${pl.id}`
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select_plan")
                    .setPlaceholder(t(interaction.user.id, "selectPlan"))
                    .addOptions(options)
            );

            return interaction.reply({
                content: t(interaction.user.id, "selectPlan"),
                components: [row],
                ephemeral: true
            });
        }

        // -------------- SELECT PLAN --------------
        if (interaction.customId === "select_plan") {
            const [pid, planId] = interaction.values[0].split("|");
            const product = data.products[pid];
            const plan = product.plans.find(p => p.id === planId);

            // اختيار طريقة الدفع
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`select_payment|${pid}|${planId}`)
                    .setPlaceholder(t(interaction.user.id, "selectPayment"))
                    .addOptions([
                        { label: "PayPal", value: "paypal" },
                        { label: "STC Pay", value: "stc" },
                        { label: "Barq", value: "barq" },
                        { label: "Bank Transfer", value: "bank" }
                    ])
            );

            return interaction.reply({
                content: "اختر وسيلة الدفع:",
                components: [row],
                ephemeral: true
            });
        }

        // -------------- SELECT PAYMENT --------------
        if (interaction.customId.startsWith("select_payment")) {
            const [_, pid, planId] = interaction.customId.split("|");
            const payment = interaction.values[0];

            const product = data.products[pid];
            const plan = product.plans.find(p => p.id === planId);

            const invoice = data.invoiceCounter++;

            data.orders[invoice] = {
                invoice,
                userId: interaction.user.id,
                productId: pid,
                planId,
                payment,
                status: "pending",
                timestamp: Date.now()
            };

            saveData(data);

            // إرسال الفاتورة بالخاص
            const embed = new EmbedBuilder()
                .setTitle(`فاتورة الدفع #${invoice}`)
                .setColor("#00bfff")
                .addFields(
                    { name: "المنتج:", value: product.name },
                    { name: "الخدمة:", value: plan.name },
                    { name: "الدفع:", value: payment }
                )
                .setFooter({ text: t(interaction.user.id, "sendProof") });

            await interaction.user.send({ embeds: [embed] });

            return interaction.reply({ content: "📨 تم إرسال الفاتورة إلى الخاص", ephemeral: true });
        }
    }
});


// =============================================
// ============ PAYMENT PROOF (DM) =============
// =============================================

async function handleDMProof(message) {
    const data = loadData();
    const pending = Object.values(data.orders).filter(
        o => o.userId === message.author.id && o.status === "pending"
    );

    if (!pending.length) return;

    const order = pending[pending.length - 1];

    const product = data.products[order.productId];
    const plan = product.plans.find(p => p.id === order.planId);

    const owner = await client.users.fetch(OWNER_ID);

    const embed = new EmbedBuilder()
        .setTitle("طلب جديد في انتظار الموافقة")
        .setColor("#ffaa00")
        .addFields(
            { name: "الفاتورة", value: `#${order.invoice}` },
            { name: "العميل", value: `<@${order.userId}>` },
            { name: "الخدمة", value: `${product.name} - ${plan.name}` },
            { name: "الدفع", value: order.payment }
        )
        .setDescription(`**الإثبات:**\n${message.content || "صورة مرفقة"}`)
        .setTimestamp();

    if (message.attachments.size > 0)
        embed.setImage(message.attachments.first().url);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`approve|${order.invoice}`)
            .setLabel("قبول")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`reject|${order.invoice}`)
            .setLabel("رفض")
            .setStyle(ButtonStyle.Danger)
    );

    await owner.send({ embeds: [embed], components: [row] });
    await message.reply("⌛ تم استلام الإثبات… بانتظار المراجعة");
}
// =============================================
// ============ APPROVE / REJECT ORDER =========
// =============================================

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const data = loadData();

    // -------- APPROVE --------
    if (interaction.customId.startsWith("approve|")) {
        if (interaction.user.id !== OWNER_ID)
            return interaction.reply({ content: "❌ غير مصرح", ephemeral: true });

        const invoice = interaction.customId.split("|")[1];
        const order = data.orders[invoice];

        if (!order)
            return interaction.reply({ content: "❌ الطلب غير موجود", ephemeral: true });

        const product = data.products[order.productId];
        const plan = product.plans.find(p => p.id === order.planId);

        // الحصول على مفتاح متاح
        const keyObj = plan.keys.find(k => !k.used);
        if (!keyObj)
            return interaction.reply({ content: "❌ لا يوجد مفاتيح متاحة!", ephemeral: true });

        keyObj.used = true;
        order.status = "completed";
        order.key = keyObj.value;

        saveData(data);

        const user = await client.users.fetch(order.userId);

        await user.send(
            `${t(order.userId, "orderApproved")}\n\`\`\`${keyObj.value}\`\`\``
        );

        await sendReviewRequest(user, order, product, plan);

        return interaction.update({
            content: `✅ تم قبول الطلب #${invoice} وتم تسليم المفتاح`,
            components: []
        });
    }

    // -------- REJECT --------
    if (interaction.customId.startsWith("reject|")) {
        if (interaction.user.id !== OWNER_ID)
            return interaction.reply({ content: "❌ غير مصرح", ephemeral: true });

        const invoice = interaction.customId.split("|")[1];
        const order = data.orders[invoice];

        if (!order)
            return interaction.reply({ content: "❌ الطلب غير موجود", ephemeral: true });

        order.status = "rejected";
        saveData(data);

        const user = await client.users.fetch(order.userId);
        await user.send(t(order.userId, "orderRejected"));

        return interaction.update({
            content: `❌ تم رفض الطلب #${invoice}`,
            components: []
        });
    }
});


// =============================================
// ============ SEND REVIEW REQUEST ============
// =============================================

async function sendReviewRequest(user, order, product, plan) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rate|1|${order.invoice}`).setLabel("⭐ 1").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate|2|${order.invoice}`).setLabel("⭐⭐ 2").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate|3|${order.invoice}`).setLabel("⭐⭐⭐ 3").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate|4|${order.invoice}`).setLabel("⭐⭐⭐⭐ 4").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate|5|${order.invoice}`).setLabel("⭐⭐⭐⭐⭐ 5").setStyle(ButtonStyle.Primary)
    );

    await user.send({
        content: t(user.id, "rateExperience"),
        components: [row]
    });
}


// =============================================
// =============== REVIEW MODAL ================
// =============================================

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("rate|")) {
        const [_, rating, invoice] = interaction.customId.split("|");

        const modal = new ModalBuilder()
            .setCustomId(`review_modal|${rating}|${invoice}`)
            .setTitle("إضافة تقييم");

        const comment = new TextInputBuilder()
            .setCustomId("comment")
            .setLabel("اكتب تعليقاً (اختياري)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(comment)
        );

        return interaction.showModal(modal);
    }
});


// =============================================
// ============== SAVE REVIEW ==================
// =============================================

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId.startsWith("review_modal")) {
        const [_, rating, invoice] = interaction.customId.split("|");

        const data = loadData();
        const order = data.orders[invoice];
        const comment = interaction.fields.getTextInputValue("comment") || "No comment";

        const review = {
            userId: order.userId,
            productId: order.productId,
            planId: order.planId,
            rating: Number(rating),
            comment,
            timestamp: Date.now()
        };

        data.reviews.push(review);
        saveData(data);

        // إرسال رد للعميل
        await interaction.reply({ content: t(order.userId, "reviewReceived"), ephemeral: true });

        // إرسال إلى روم الـ Reviews
        const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);

        const product = data.products[order.productId];
        const plan = product.plans.find(p => p.id === order.planId);

        const stars = "⭐".repeat(Number(rating));

        const embed = new EmbedBuilder()
            .setTitle(`${stars} (${rating}/5)`)
            .setColor("#ffaa00")
            .addFields(
                { name: "العميل", value: `<@${order.userId}>` },
                { name: "المنتج", value: product.name },
                { name: "الخدمة", value: plan.name },
                { name: "التعليق", value: comment }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }
});


// =============================================
// ============== DASHBOARD API ================
// =============================================

// health
app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

// login
const adminSessions = {};

function createToken() {
    return crypto.randomBytes(24).toString("hex");
}

app.post("/api/admin/login", (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(401).json({ error: "wrong_password" });

    const token = createToken();
    adminSessions[token] = { created: Date.now() };

    return res.json({ token });
});

function adminAuth(req, res, next) {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!adminSessions[token]) return res.status(401).json({ error: "unauthorized" });
    next();
}

// fetch stats
app.get("/api/stats", (req, res) => {
    const data = loadData();
    const totalProducts = Object.keys(data.products).length;
    const totalPlans = Object.values(data.products).reduce((acc, p) => acc + p.plans.length, 0);
    const totalReviews = data.reviews.length;
    const totalOrders = Object.keys(data.orders).length;

    res.json({ totalProducts, totalPlans, totalOrders, totalReviews });
});

// fetch products
app.get("/api/products", adminAuth, (req, res) => {
    const data = loadData();
    res.json(data.products);
});

// fetch orders
app.get("/api/orders", adminAuth, (req, res) => {
    const data = loadData();
    res.json(data.orders);
});

// fetch reviews
app.get("/api/reviews", adminAuth, (req, res) => {
    const data = loadData();
    res.json(data.reviews);
});


// =============================================
// ============== START SERVER =================
// =============================================

app.get("/", (req, res) => {
    res.send("P9 Shop Dashboard Running ✔");
});

app.listen(PORT, () =>
    console.log(`🌐 Dashboard running on port ${PORT}`)
);

client.login(TOKEN);
