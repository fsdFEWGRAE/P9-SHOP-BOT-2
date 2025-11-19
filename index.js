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

// =========== Express App ===========
const app = express();
app.use(express.json());

// =========== Config ===========
const PREFIX = "-";
const REVIEW_CHANNEL_ID = "1438169825489719326";

const OWNER_ID = process.env.OWNER_ID;
const TOKEN = process.env.DISCORD_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const PORT = process.env.PORT || 3000;

// طرق الدفع (ثابتة)
const PAYMENT_DETAILS = {
  bank: "تحويل بنكي:\nSA1980204507849222121014",
  stc: "STC Pay / Barq:\nOpen a ticket to get transfer number",
  barq: "STC Pay / Barq:\nOpen a ticket to get transfer number",
  paypal: "PayPal:\n17sutef2@gmail.com",
  giftcard: "Gift Card:\nلازم من هذا الموقع فقط:\nhttps://skine.com/en-us/rewarble"
};

// =========== Translations ===========
const translations = {
  en: {
    productAdded: "Product added successfully!",
    planAdded: "Plan added successfully!",
    keyAdded: "Key added successfully!",
    productNotFound: "Product not found!",
    planNotFound: "Plan not found!",
    selectProduct: "Select a product:",
    selectPlan: "Select subscription duration:",
    selectPayment: "Choose payment method:",
    noProducts: "No products available!",
    noPlans: "This product has no plans!",
    noKeys: "This plan has no keys left!",
    invoiceTitle: "Payment Invoice",
    sendProof: "Please send payment proof here.",
    invoiceSent: "Invoice has been sent to your DMs.",
    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order was rejected.",
    rateExperience: "Please rate your experience!",
    reviewReceived: "Thanks for your review!",
    languageChanged: "Language changed successfully!",
    notOwner: "You are not the owner.",
    stockHeader: "📦 Stock Status:",
    noStockProducts: "No products found.",
    chooseLanguage: "Choose your language:",
    chooseShop: "Press the button to open the shop menu:"
  },
  ar: {
    productAdded: "تم إضافة المنتج بنجاح!",
    planAdded: "تم إضافة المدة بنجاح!",
    keyAdded: "تم إضافة المفتاح بنجاح!",
    productNotFound: "المنتج غير موجود!",
    planNotFound: "الخدمة / المدة غير موجودة!",
    selectProduct: "اختر منتج:",
    selectPlan: "اختر المدة:",
    selectPayment: "اختر وسيلة الدفع:",
    noProducts: "لا توجد منتجات متاحة!",
    noPlans: "هذا المنتج لا يحتوي على فترات!",
    noKeys: "هذه المدة لا تحتوي على مفاتيح متاحة!",
    invoiceTitle: "فاتورة الدفع",
    sendProof: "أرسل إثبات الدفع هنا.",
    invoiceSent: "تم إرسال الفاتورة إلى الخاص.",
    orderApproved: "تمت الموافقة على طلبك! هذا مفتاحك:",
    orderRejected: "تم رفض طلبك.",
    rateExperience: "يرجى تقييم تجربتك!",
    reviewReceived: "شكراً على التقييم!",
    languageChanged: "تم تغيير اللغة!",
    notOwner: "❌ أنت لست المالك.",
    stockHeader: "📦 **حالة المخزون:**",
    noStockProducts: "❌ لا توجد منتجات حالياً.",
    chooseLanguage: "اختر لغتك / Choose your language:",
    chooseShop: "اضغط لفتح قائمة المتجر:"
  }
};

// =========== Load / Save Data ===========
function loadData() {
  try {
    const raw = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(raw);
    data.products = data.products || {};
    data.orders = data.orders || {};
    data.reviews = data.reviews || [];
    data.userLanguages = data.userLanguages || {};
    data.invoiceCounter = data.invoiceCounter || 1000;
    return data;
  } catch (e) {
    return {
      products: {}, // { productId: { id, name, plans:[{id,name,keys:[{value,used}]}] } }
      orders: {},   // { invoice: {...} }
      reviews: [],
      userLanguages: {},
      invoiceCounter: 1000
    };
  }
}

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

// =========== Ready ===========
client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

// =============================================
// ============ MESSAGE COMMANDS ===============
// =============================================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // DM بدون بريفيكس = إثبات دفع
  if (!message.content.startsWith(PREFIX)) {
    if (message.channel.type === 1) {
      handleDMProof(message);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // ---------- زر اللغة ----------
  if (command === "sendlang") {
    const row = new ActionRowBuilder().addComponents(
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
      content: translations["ar"].chooseLanguage,
      components: [row]
    });
  }

  // ---------- زر المتجر ----------
  if (command === "sendshop") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_shop")
        .setLabel("🛒 فتح المتجر | Open Shop")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({
      content: translations["ar"].chooseShop,
      components: [row]
    });
  }

  // باقي الأوامر تحتاج OWNER
  if (["addproduct", "addplan", "addkey", "stock"].includes(command)) {
    if (message.author.id !== OWNER_ID) {
      return message.reply(t(message.author.id, "notOwner"));
    }
  }

  const data = loadData();

  // ---------- addproduct ----------
  if (command === "addproduct") {
    const parts = args.join(" ").split("|").map(p => p.trim());
    if (parts.length < 2) {
      return message.reply("استخدم: -addproduct productId | name");
    }
    const [id, name] = parts;

    if (!data.products[id]) {
      data.products[id] = {
        id,
        name,
        plans: []
      };
    } else {
      data.products[id].name = name;
    }

    saveData(data);
    return message.reply(t(message.author.id, "productAdded"));
  }

  // ---------- addplan ----------
  if (command === "addplan") {
    const parts = args.join(" ").split("|").map(p => p.trim());
    if (parts.length < 3) {
      return message.reply("استخدم: -addplan productId | planId | planName");
    }

    const [pid, planId, planName] = parts;
    const product = data.products[pid];
    if (!product) {
      return message.reply(t(message.author.id, "productNotFound"));
    }

    const existing = product.plans.find(p => p.id === planId);
    if (existing) {
      existing.name = planName;
    } else {
      product.plans.push({
        id: planId,
        name: planName,
        keys: []
      });
    }

    saveData(data);
    return message.reply(t(message.author.id, "planAdded"));
  }

  // ---------- addkey ----------
  if (command === "addkey") {
    const parts = args.join(" ").split("|").map(p => p.trim());
    if (parts.length < 3) {
      return message.reply("استخدم: -addkey productId | planId | KEY");
    }

    const [pid, planId, keyValue] = parts;

    const product = data.products[pid];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    const plan = product.plans.find(p => p.id === planId);
    if (!plan) return message.reply(t(message.author.id, "planNotFound"));

    plan.keys.push({ value: keyValue, used: false });
    saveData(data);

    return message.reply(t(message.author.id, "keyAdded"));
  }

  // ---------- stock ----------
  if (command === "stock") {
    const products = Object.values(data.products);
    if (!products.length) {
      return message.reply(t(message.author.id, "noStockProducts"));
    }

    let msg = t(message.author.id, "stockHeader") + "\n\n";
    products.forEach(prod => {
      msg += `🔷 **${prod.name}** (${prod.id})\n`;
      if (!prod.plans.length) {
        msg += `   ↳ لا توجد فترات.\n\n`;
      } else {
        prod.plans.forEach(pl => {
          const total = (pl.keys || []).filter(k => !k.used).length;
          let icon = "🟩";
          if (total < 5) icon = "🟧";
          if (total === 0) icon = "🟥";
          msg += `   ${icon} ${pl.name} [${pl.id}] — **${total}** مفتاح\n`;
        });
        msg += "\n";
      }
    });

    return message.reply(msg);
  }

  // ---------- lang (تغيير اللغة) ----------
  if (command === "lang") {
    const lang = args[0]?.toLowerCase();
    if (!["ar", "en"].includes(lang)) {
      return message.reply("استخدم: -lang ar أو -lang en");
    }
    data.userLanguages[message.author.id] = lang;
    saveData(data);
    return message.reply(t(message.author.id, "languageChanged"));
  }
});

// =============================================
// ============ INTERACTIONS (ALL) =============
// =============================================

client.on("interactionCreate", async (interaction) => {
  const data = loadData();

  // -------------- LANGUAGE BUTTONS --------------
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

    // ---------- فتح المتجر ----------
    if (interaction.customId === "open_shop") {
      const products = Object.values(data.products);
      if (!products.length) {
        return interaction.reply({
          content: t(interaction.user.id, "noProducts"),
          ephemeral: true
        });
      }

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

    // ---------- قبول / رفض طلب ----------
    if (interaction.customId.startsWith("approve|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: t(interaction.user.id, "notOwner"), ephemeral: true });
      }

      const invoice = interaction.customId.split("|")[1];
      const order = data.orders[invoice];
      if (!order) {
        return interaction.reply({ content: "الطلب غير موجود.", ephemeral: true });
      }

      const product = data.products[order.productId];
      if (!product) {
        return interaction.reply({ content: "المنتج غير موجود.", ephemeral: true });
      }

      const plan = product.plans.find(p => p.id === order.planId);
      if (!plan) {
        return interaction.reply({ content: "الخدمة غير موجودة.", ephemeral: true });
      }

      const keyObj = (plan.keys || []).find(k => !k.used);
      if (!keyObj) {
        return interaction.reply({ content: "لا يوجد مفاتيح متاحة!", ephemeral: true });
      }

      keyObj.used = true;
      order.status = "completed";
      order.key = keyObj.value;
      saveData(data);

      const buyer = await client.users.fetch(order.userId);
      await buyer.send(
        `${t(order.userId, "orderApproved")}\n\`\`\`${keyObj.value}\`\`\``
      );

      await sendReviewRequest(buyer, order, product, plan);

      return interaction.update({
        content: `✅ تم قبول الطلب #${invoice} وتسليم المفتاح.`,
        components: []
      });
    }

    if (interaction.customId.startsWith("reject|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: t(interaction.user.id, "notOwner"), ephemeral: true });
      }

      const invoice = interaction.customId.split("|")[1];
      const order = data.orders[invoice];
      if (!order) {
        return interaction.reply({ content: "الطلب غير موجود.", ephemeral: true });
      }

      order.status = "rejected";
      saveData(data);

      const buyer = await client.users.fetch(order.userId);
      await buyer.send(t(order.userId, "orderRejected"));

      return interaction.update({
        content: `❌ تم رفض الطلب #${invoice}.`,
        components: []
      });
    }

    // ---------- زر التقييم ----------
    if (interaction.customId.startsWith("rate|")) {
      const parts = interaction.customId.split("|"); // rate|rating|invoice
      const rating = parts[1];
      const invoice = parts[2];

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

    return; // end button handler
  }

  // -------------- SELECT MENUS --------------
  if (interaction.isStringSelectMenu()) {
    // --- اختيار المنتج ---
    if (interaction.customId === "select_product") {
      const pid = interaction.values[0];
      const product = data.products[pid];
      if (!product) {
        return interaction.reply({ content: t(interaction.user.id, "productNotFound"), ephemeral: true });
      }

      const plans = product.plans || [];
      if (!plans.length) {
        return interaction.reply({ content: t(interaction.user.id, "noPlans"), ephemeral: true });
      }

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

    // --- اختيار المدة ---
    if (interaction.customId === "select_plan") {
      const [pid, planId] = interaction.values[0].split("|");
      const product = data.products[pid];
      if (!product) {
        return interaction.reply({ content: t(interaction.user.id, "productNotFound"), ephemeral: true });
      }
      const plan = product.plans.find(p => p.id === planId);
      if (!plan) {
        return interaction.reply({ content: t(interaction.user.id, "planNotFound"), ephemeral: true });
      }

      const available = (plan.keys || []).filter(k => !k.used).length;
      if (!available) {
        return interaction.reply({ content: t(interaction.user.id, "noKeys"), ephemeral: true });
      }

      const paymentRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_payment|${pid}|${planId}`)
          .setPlaceholder(t(interaction.user.id, "selectPayment"))
          .addOptions([
            { label: "Bank Transfer", value: "bank" },
            { label: "STC Pay / Barq", value: "stc" },
            { label: "PayPal", value: "paypal" },
            { label: "Gift Card", value: "giftcard" }
          ])
      );

      return interaction.reply({
        content: t(interaction.user.id, "selectPayment"),
        components: [paymentRow],
        ephemeral: true
      });
    }

    // --- اختيار طريقة الدفع ---
    if (interaction.customId.startsWith("select_payment")) {
      const [_, pid, planId] = interaction.customId.split("|");
      const paymentMethod = interaction.values[0];

      const product = data.products[pid];
      const plan = product.plans.find(p => p.id === planId);
      if (!product || !plan) {
        return interaction.reply({ content: "خطأ في البيانات.", ephemeral: true });
      }

      const invoice = data.invoiceCounter++;
      data.orders[invoice] = {
        invoice,
        userId: interaction.user.id,
        productId: pid,
        planId,
        payment: paymentMethod,
        status: "pending",
        timestamp: Date.now()
      };
      saveData(data);

      // نص طريقة الدفع
      const payText = PAYMENT_DETAILS[paymentMethod] || "";

      const embed = new EmbedBuilder()
        .setTitle(`${t(interaction.user.id, "invoiceTitle")} #${invoice}`)
        .setColor("#00bfff")
        .addFields(
          { name: "المنتج / Product", value: product.name, inline: false },
          { name: "المدة / Plan", value: plan.name, inline: false },
          { name: "طريقة الدفع / Payment", value: paymentMethod.toUpperCase(), inline: false },
          { name: "تفاصيل الدفع / Payment Details", value: payText || "N/A", inline: false }
        )
        .setFooter({ text: t(interaction.user.id, "sendProof") })
        .setTimestamp();

      // DM للعميل
      await interaction.user.send({ embeds: [embed] });

      return interaction.reply({
        content: t(interaction.user.id, "invoiceSent"),
        ephemeral: true
      });
    }

    return; // end select menus
  }

  // -------------- REVIEW MODAL SUBMIT --------------
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("review_modal")) {
      const parts = interaction.customId.split("|"); // review_modal|rating|invoice
      const rating = Number(parts[1]);
      const invoice = parts[2];

      const data2 = loadData();
      const order = data2.orders[invoice];
      if (!order) {
        return interaction.reply({ content: "الطلب غير موجود.", ephemeral: true });
      }

      const comment = interaction.fields.getTextInputValue("comment") || "No comment";

      const review = {
        userId: order.userId,
        productId: order.productId,
        planId: order.planId,
        rating,
        comment,
        timestamp: Date.now()
      };

      data2.reviews.push(review);
      saveData(data2);

      await interaction.reply({ content: t(order.userId, "reviewReceived"), ephemeral: true });

      const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
      const product = data2.products[order.productId];
      const plan = product.plans.find(p => p.id === order.planId);
      const stars = "⭐".repeat(rating);

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
      { name: "الفاتورة", value: `#${order.invoice}`, inline: true },
      { name: "العميل", value: `<@${order.userId}>`, inline: true },
      { name: "الخدمة", value: `${product.name} - ${plan.name}`, inline: false },
      { name: "طريقة الدفع", value: order.payment.toUpperCase(), inline: false }
    )
    .setDescription(`**الإثبات:**\n${message.content || "صورة مرفقة"}`)
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

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
// ============ REVIEW REQUEST DM ==============
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
// ============== DASHBOARD API ================
// =============================================

// جلسات الأدمن
const adminSessions = {};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Login للداشبورد
app.post("/api/admin/login", (req, res) => {
  const pw = req.body && req.body.password;
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }
  const token = createToken();
  adminSessions[token] = { createdAt: Date.now() };
  res.json({ token });
});

function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !adminSessions[token]) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Stats
app.get("/api/stats", (req, res) => {
  const data = loadData();
  const totalProducts = Object.keys(data.products).length;
  const totalPlans = Object.values(data.products).reduce(
    (acc, p) => acc + (p.plans ? p.plans.length : 0),
    0
  );
  const totalOrders = Object.keys(data.orders).length;
  const totalReviews = data.reviews.length;

  res.json({ totalProducts, totalPlans, totalOrders, totalReviews });
});

// Products CRUD
app.get("/api/products", adminAuth, (req, res) => {
  const data = loadData();
  res.json(data.products);
});

app.post("/api/products", adminAuth, (req, res) => {
  const { id, name } = req.body || {};
  if (!id || !name) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const data = loadData();
  if (!data.products[id]) {
    data.products[id] = { id, name, plans: [] };
  } else {
    data.products[id].name = name;
  }
  saveData(data);
  res.json({ ok: true });
});

app.post("/api/products/:pid/plans", adminAuth, (req, res) => {
  const pid = req.params.pid;
  const { planId, name } = req.body || {};
  if (!planId || !name) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const data = loadData();
  const product = data.products[pid];
  if (!product) return res.status(404).json({ error: "product_not_found" });

  product.plans = product.plans || [];
  const existing = product.plans.find(p => p.id === planId);
  if (existing) {
    existing.name = name;
  } else {
    product.plans.push({
      id: planId,
      name,
      keys: []
    });
  }

  saveData(data);
  res.json({ ok: true });
});

app.post("/api/products/:pid/plans/:planId/keys", adminAuth, (req, res) => {
  const pid = req.params.pid;
  const planId = req.params.planId;
  const { keys } = req.body || {};
  if (!Array.isArray(keys) || !keys.length) {
    return res.status(400).json({ error: "keys_required" });
  }

  const data = loadData();
  const product = data.products[pid];
  if (!product) return res.status(404).json({ error: "product_not_found" });

  const plan = (product.plans || []).find(p => p.id === planId);
  if (!plan) return res.status(404).json({ error: "plan_not_found" });

  plan.keys = plan.keys || [];
  keys.forEach(k => {
    plan.keys.push({ value: k, used: false });
  });

  saveData(data);
  res.json({ ok: true, added: keys.length });
});

// Orders / Reviews read
app.get("/api/orders", adminAuth, (req, res) => {
  const data = loadData();
  res.json(data.orders);
});

app.get("/api/reviews", adminAuth, (req, res) => {
  const data = loadData();
  res.json(data.reviews);
});

// =============================================
// ============== DASHBOARD PAGE ===============
// =============================================

app.get("/", (req, res) => {
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
  h2 { font-size:18px; font-weight:700; margin-bottom:6px; }
  p { font-size:13px; color:#9ca3af; }
  input, button, textarea { font-family:inherit; }
  input[type=password], input[type=text], input[type=number], textarea {
    width:100%; margin-top:6px; padding:8px 10px; border-radius:8px; border:1px solid #4b5563;
    background:#020617; color:#e5e7eb; outline:none; font-size:13px;
  }
  input:focus, textarea:focus { border-color:#0ea5e9; }
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
  .mt24 { margin-top:24px; }
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
  .main-header-right { font-size:12px; color:#9ca3af; }
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

  .field { margin-bottom:8px; font-size:13px; }
  .field label { display:block; margin-bottom:4px; color:#9ca3af; }

  .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:8px; }

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
    <h1>P9 Shop Admin</h1>
    <p>Login using <code>ADMIN_PASSWORD</code> (env variable).</p>
    <div class="mt12">
      <div class="field">
        <label>Password</label>
        <input type="password" id="pwInput" placeholder="Admin password" />
      </div>
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
          <div class="main-header-right" id="lastUpdated">–</div>
        </div>
        <div class="views">
          <section id="view-stats" class="view active">
            <div class="stat-grid">
              <div class="card stat-card">
                <h3>Total Products</h3>
                <div class="value" id="statProducts">-</div>
              </div>
              <div class="card stat-card">
                <h3>Total Plans</h3>
                <div class="value" id="statPlans">-</div>
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
            <h2>Products & Plans</h2>
            <div class="form-grid mt8">
              <div class="card">
                <h3>Add / Update Product</h3>
                <div class="field mt8">
                  <label>Product ID</label>
                  <input id="p_id" />
                </div>
                <div class="field">
                  <label>Name</label>
                  <input id="p_name" />
                </div>
                <button class="btn btn-primary mt8" onclick="addProduct()">Save Product</button>
              </div>
              <div class="card">
                <h3>Add / Update Plan</h3>
                <div class="field mt8">
                  <label>Product ID</label>
                  <input id="pl_pid" />
                </div>
                <div class="field">
                  <label>Plan ID (e.g. 1d, 3d, week)</label>
                  <input id="pl_id" />
                </div>
                <div class="field">
                  <label>Plan Name</label>
                  <input id="pl_name" />
                </div>
                <button class="btn btn-primary mt8" onclick="addPlan()">Save Plan</button>
              </div>
              <div class="card">
                <h3>Add Keys</h3>
                <div class="field mt8">
                  <label>Product ID</label>
                  <input id="k_pid" />
                </div>
                <div class="field">
                  <label>Plan ID</label>
                  <input id="k_planId" />
                </div>
                <div class="field">
                  <label>Keys (one per line)</label>
                  <textarea id="k_values" placeholder="KEY-1&#10;KEY-2&#10;KEY-3"></textarea>
                </div>
                <button class="btn btn-primary mt8" onclick="addKeys()">Add Keys</button>
              </div>
            </div>

            <div class="card mt16">
              <h3>Current Products</h3>
              <table id="productsTable">
                <thead>
                  <tr><th>Product ID</th><th>Name</th><th>Plan ID</th><th>Plan Name</th><th>Total Keys</th><th>Unused Keys</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section id="view-orders" class="view">
            <h2>Orders</h2>
            <div class="card mt8">
              <table id="ordersTable">
                <thead>
                  <tr><th>Invoice</th><th>User ID</th><th>Product</th><th>Plan</th><th>Payment</th><th>Status</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <section id="view-reviews" class="view">
            <h2>Reviews</h2>
            <div class="card mt8">
              <table id="reviewsTable">
                <thead>
                  <tr><th>User</th><th>Product</th><th>Plan</th><th>Rating</th><th>Comment</th><th>Time</th></tr>
                </thead>
                <tbody></tbody>
              </table>
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

function setLoginStatus(msg, ok) {
  var el = document.getElementById('loginStatus');
  el.innerHTML = 'Status: <span class="' + (ok ? 'status-ok' : 'status-bad') + '">' + msg + '</span>';
}

function checkHealth() {
  fetch('/api/health')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(() => setLoginStatus('Backend OK', true))
    .catch(() => setLoginStatus('Backend not responding', false));
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
    view === 'reviews' ? 'Reviews' : view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  var active = document.getElementById('view-' + view);
  if (active) active.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  var btn = document.querySelector('.nav-btn[data-view="' + view + '"]');
  if (btn) btn.classList.add('active');

  var d = new Date();
  document.getElementById('lastUpdated').textContent = 'Last refresh: ' + d.toLocaleString();

  if (view === 'stats') loadStats();
  if (view === 'products') loadProducts();
  if (view === 'orders') loadOrders();
  if (view === 'reviews') loadReviews();
}

function refreshCurrent() {
  setView(currentView);
}

async function authedFetch(url, options) {
  if (!token) throw new Error('Not logged in');
  options = options || {};
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, options);
}

// ========== Stats ==========
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('statProducts').textContent = s.totalProducts;
    document.getElementById('statPlans').textContent = s.totalPlans;
    document.getElementById('statOrders').textContent = s.totalOrders;
    document.getElementById('statReviews').textContent = s.totalReviews;
  } catch (e) {
    console.error(e);
  }
}

// ========== Products / Plans / Keys ==========
async function loadProducts() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/products');
    const products = await res.json();
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    Object.values(products).forEach(p => {
      if (!p.plans || !p.plans.length) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + p.id + '</td>' +
          '<td>' + p.name + '</td>' +
          '<td>-</td>' +
          '<td>-</td>' +
          '<td>0</td>' +
          '<td>0</td>';
        tbody.appendChild(tr);
      } else {
        p.plans.forEach(pl => {
          var total = (pl.keys || []).length;
          var unused = (pl.keys || []).filter(k => !k.used).length;
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + p.id + '</td>' +
            '<td>' + p.name + '</td>' +
            '<td>' + pl.id + '</td>' +
            '<td>' + pl.name + '</td>' +
            '<td>' + total + '</td>' +
            '<td>' + unused + '</td>';
          tbody.appendChild(tr);
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function addProduct() {
  if (!token) return alert('Login first');
  var id = document.getElementById('p_id').value.trim();
  var name = document.getElementById('p_name').value.trim();
  if (!id || !name) {
    alert('Fill product id and name');
    return;
  }
  try {
    const res = await authedFetch('/api/products', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id:id, name:name })
    });
    if (!res.ok) {
      alert('Error saving product');
      return;
    }
    document.getElementById('p_id').value = '';
    document.getElementById('p_name').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addPlan() {
  if (!token) return alert('Login first');
  var pid = document.getElementById('pl_pid').value.trim();
  var pidPlan = document.getElementById('pl_id').value.trim();
  var name = document.getElementById('pl_name').value.trim();
  if (!pid || !pidPlan || !name) {
    alert('Fill product id, plan id and name');
    return;
  }
  try {
    const res = await authedFetch('/api/products/' + encodeURIComponent(pid) + '/plans', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ planId: pidPlan, name:name })
    });
    if (!res.ok) {
      alert('Error saving plan');
      return;
    }
    document.getElementById('pl_pid').value = '';
    document.getElementById('pl_id').value = '';
    document.getElementById('pl_name').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addKeys() {
  if (!token) return alert('Login first');
  var pid = document.getElementById('k_pid').value.trim();
  var planId = document.getElementById('k_planId').value.trim();
  var raw = document.getElementById('k_values').value;
  if (!pid || !planId || !raw.trim()) {
    alert('Fill product id, plan id and keys');
    return;
  }
  var keys = raw.split('\\n').map(function (x) { return x.trim(); }).filter(Boolean);
  try {
    const res = await authedFetch('/api/products/' + encodeURIComponent(pid) + '/plans/' + encodeURIComponent(planId) + '/keys', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ keys: keys })
    });
    if (!res.ok) {
      alert('Error adding keys');
      return;
    }
    document.getElementById('k_pid').value = '';
    document.getElementById('k_planId').value = '';
    document.getElementById('k_values').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

// ========== Orders ==========
async function loadOrders() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/orders');
    const orders = await res.json();
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';
    Object.values(orders).forEach(o => {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>#' + o.invoice + '</td>' +
        '<td>' + o.userId + '</td>' +
        '<td>' + o.productId + '</td>' +
        '<td>' + o.planId + '</td>' +
        '<td>' + o.payment + '</td>' +
        '<td>' + o.status + '</td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

// ========== Reviews ==========
async function loadReviews() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/reviews');
    const reviews = await res.json();
    const tbody = document.querySelector('#reviewsTable tbody');
    tbody.innerHTML = '';
    reviews.forEach(r => {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + r.userId + '</td>' +
        '<td>' + r.productId + '</td>' +
        '<td>' + r.planId + '</td>' +
        '<td>' + r.rating + '</td>' +
        '<td>' + (r.comment || '') + '</td>' +
        '<td>' + new Date(r.timestamp).toLocaleString() + '</td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}
</script>
</body>
</html>`);
});

// =============================================
// ============== START SERVER =================
// =============================================

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
});

client.login(TOKEN);
