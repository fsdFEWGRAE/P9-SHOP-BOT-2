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

// بيانات الدفع (عدلها على كيفك)
const PAYMENT_CONFIG = {
  paypal: {
    noteAr: "أرسل المبلغ إلى حساب PayPal: your-paypal@example.com",
    noteEn: "Send the amount to PayPal: your-paypal@example.com"
  },
  stc: {
    noteAr: "حوّل على STC Pay: 05XXXXXXXX",
    noteEn: "Send to STC Pay: 05XXXXXXXX"
  },
  barq: {
    noteAr: "استخدم Barq على الرقم: 05XXXXXXXX",
    noteEn: "Use Barq on number: 05XXXXXXXX"
  },
  bank: {
    noteAr: "حساب بنكي: SA00 0000 0000 0000 0000 0000",
    noteEn: "Bank IBAN: SA00 0000 0000 0000 0000 0000"
  }
};

// =========== Translations ===========
const translations = {
  en: {
    productAdded: "Product added successfully!",
    planAdded: "Plan added successfully!",
    keyAdded: "Key(s) added successfully!",
    productNotFound: "Product not found!",
    planNotFound: "Plan not found!",
    selectProduct: "Select a product:",
    selectPlan: "Select subscription duration:",
    selectPayment: "Choose payment method:",
    noProducts: "No products available!",
    noStock: "This plan has no keys left!",
    invoiceTitle: "Payment Invoice",
    sendProof: "Please send payment proof here.",
    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order was rejected.",
    rateExperience: "Please rate your experience!",
    reviewReceived: "Thanks for your review!",
    languageChanged: "Language changed successfully!",
    stockHeader: "Stock status:",
    noOrders: "You have no pending orders."
  },
  ar: {
    productAdded: "تم إضافة المنتج بنجاح!",
    planAdded: "تمت إضافة المدة بنجاح!",
    keyAdded: "تم إضافة المفتاح/المفاتيح بنجاح!",
    productNotFound: "المنتج غير موجود!",
    planNotFound: "الفترة غير موجودة!",
    selectProduct: "اختر منتج:",
    selectPlan: "اختر المدة:",
    selectPayment: "اختر وسيلة الدفع:",
    noProducts: "لا توجد منتجات!",
    noStock: "هذه المدة لا تحتوي على مفاتيح!",
    invoiceTitle: "فاتورة الدفع",
    sendProof: "أرسل إثبات الدفع هنا.",
    orderApproved: "تمت الموافقة على طلبك! هذا مفتاحك:",
    orderRejected: "تم رفض طلبك.",
    rateExperience: "يرجى تقييم تجربتك!",
    reviewReceived: "شكراً على التقييم!",
    languageChanged: "تم تغيير اللغة!",
    stockHeader: "حالة المخزون:",
    noOrders: "لا يوجد لديك طلبات معلّقة."
  }
};

// =========== Data Helpers ===========
function loadData() {
  try {
    const raw = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(raw);
    data.products = data.products || {};
    data.orders = data.orders || {};
    data.reviews = data.reviews || [];
    data.userLanguages = data.userLanguages || {};
    data.discounts = data.discounts || {};
    data.discountRedemptions = data.discountRedemptions || {};
    data.invoiceCounter = data.invoiceCounter || 1000;

    // تأكد أن كل منتج فيه plans
    for (const id of Object.keys(data.products)) {
      data.products[id].plans = data.products[id].plans || [];
      data.products[id].name = data.products[id].name || id;
    }

    return data;
  } catch (e) {
    return {
      products: {},
      orders: {},
      reviews: [],
      userLanguages: {},
      discounts: {},
      discountRedemptions: {},
      invoiceCounter: 1000
    };
  }
}

function saveData(data) {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getLang(userId) {
  const data = loadData();
  return data.userLanguages[userId] || "ar";
}

function t(userId, key) {
  const lang = getLang(userId);
  return translations[lang][key] || translations.en[key] || key;
}

// =========== Bot Ready ===========
client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

// =============================================
// ============ MESSAGE COMMANDS ===============
// =============================================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // DM proof (أي رسالة في الخاص بدون - تعتبر إثبات)
  if (message.channel.type === 1 && !message.content.startsWith(PREFIX)) {
    await handleDMProof(message);
    return;
  }

  // أزرار إعداد اللغة / المتجر بدون ما يكون أمر
  if (message.content === "-sendlang") {
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
      content: "اختر لغتك / Choose your language:",
      components: [row]
    });
  }

  if (message.content === "-sendshop") {
    const row = new ActionRowBuilder().addComponents(
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

  // باقي الأوامر
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  const data = loadData();

  // ---- help ----
  if (command === "help") {
    return message.reply(
      [
        "📜 **الأوامر المتاحة / Commands:**",
        "",
        "-help",
        "-addproduct id | name",
        "-addplan productId | planId | name | price(optional)",
        "-addkey productId | planId | keyValue",
        "-stock",
        "-sendshop",
        "-sendlang"
      ].join("\n")
    );
  }

  // ---- addproduct ----
  if (command === "addproduct") {
    if (message.author.id !== OWNER_ID)
      return message.reply("❌ أنت لست المالك.");

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 2)
      return message.reply("❌ استخدم: -addproduct id | name");

    const [id, name] = parts;

    data.products[id] = data.products[id] || {
      id,
      name,
      plans: []
    };
    data.products[id].name = name;

    saveData(data);
    return message.reply(t(message.author.id, "productAdded"));
  }

  // ---- addplan ----
  if (command === "addplan") {
    if (message.author.id !== OWNER_ID)
      return message.reply("❌ أنت لست المالك.");

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 3)
      return message.reply(
        "❌ استخدم: -addplan productId | planId | name | price(optional)"
      );

    const [productId, planId, planName, planPriceRaw] = parts;

    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    const existing = product.plans.find((p) => p.id === planId);
    const price = planPriceRaw ? Number(planPriceRaw) : null;

    if (existing) {
      existing.name = planName;
      if (!isNaN(price)) existing.price = price;
    } else {
      product.plans.push({
        id: planId,
        name: planName,
        price: isNaN(price) ? null : price,
        keys: []
      });
    }

    saveData(data);
    return message.reply(t(message.author.id, "planAdded"));
  }

  // ---- addkey ----
  if (command === "addkey") {
    if (message.author.id !== OWNER_ID)
      return message.reply("❌ غير مصرح.");

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 3)
      return message.reply(
        "❌ استخدم: -addkey productId | planId | keyValue"
      );

    const [productId, planId, keyValue] = parts;
    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    const plan = product.plans.find((p) => p.id === planId);
    if (!plan) return message.reply(t(message.author.id, "planNotFound"));

    plan.keys.push({ value: keyValue, used: false });

    saveData(data);
    return message.reply(t(message.author.id, "keyAdded"));
  }

  // ---- stock ----
  if (command === "stock") {
    const products = Object.values(data.products);
    if (products.length === 0)
      return message.reply(t(message.author.id, "noProducts"));

    let msg = "📦 **" + t(message.author.id, "stockHeader") + "**\n\n";

    products.forEach((prod) => {
      msg += `🔹 **${prod.name}** (${prod.id})\n`;
      if (!prod.plans.length) {
        msg += "   ❌ لا توجد فترات.\n\n";
        return;
      }

      prod.plans.forEach((pl) => {
        const stock = (pl.keys || []).filter((k) => !k.used).length;
        let color = "🟩";
        if (stock === 0) color = "🟥";
        else if (stock < 5) color = "🟧";

        msg += `   ${color} **${pl.name}** [${pl.id}] — Keys: **${stock}**\n`;
      });

      msg += "\n";
    });

    return message.reply(msg);
  }
});

// =============================================
// ============ INTERACTIONS ===================
// =============================================

client.on("interactionCreate", async (interaction) => {
  const data = loadData();

  // -------------- LANGUAGE BUTTONS --------------
  if (interaction.isButton()) {
    if (interaction.customId === "lang_ar") {
      data.userLanguages[interaction.user.id] = "ar";
      saveData(data);
      return interaction.reply({
        content: "تم تغيير اللغة 🇸🇦",
        ephemeral: true
      });
    }
    if (interaction.customId === "lang_en") {
      data.userLanguages[interaction.user.id] = "en";
      saveData(data);
      return interaction.reply({
        content: "Language updated 🇬🇧",
        ephemeral: true
      });
    }
  }

  // -------------- OPEN SHOP BUTTON --------------
  if (interaction.isButton() && interaction.customId === "open_shop") {
    const products = Object.values(data.products);
    if (!products.length) {
      return interaction.reply({
        content: t(interaction.user.id, "noProducts"),
        ephemeral: true
      });
    }

    const options = products.map((p) => ({
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
  if (interaction.isStringSelectMenu() && interaction.customId === "select_product") {
    const pid = interaction.values[0];
    const product = data.products[pid];
    if (!product) {
      return interaction.reply({
        content: t(interaction.user.id, "productNotFound"),
        ephemeral: true
      });
    }

    const plans = product.plans || [];
    if (!plans.length) {
      return interaction.reply({
        content: "❌ هذا المنتج لا يحتوي على فترات.",
        ephemeral: true
      });
    }

    const options = plans.map((pl) => ({
      label: pl.price != null ? pl.name + " - " + pl.price : pl.name,
      value: pid + "|" + pl.id
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
  if (interaction.isStringSelectMenu() && interaction.customId === "select_plan") {
    const [pid, planId] = interaction.values[0].split("|");
    const product = data.products[pid];
    if (!product) {
      return interaction.reply({
        content: t(interaction.user.id, "productNotFound"),
        ephemeral: true
      });
    }
    const plan = product.plans.find((p) => p.id === planId);
    if (!plan) {
      return interaction.reply({
        content: t(interaction.user.id, "planNotFound"),
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_payment|" + pid + "|" + planId)
        .setPlaceholder(t(interaction.user.id, "selectPayment"))
        .addOptions([
          { label: "PayPal", value: "paypal" },
          { label: "STC Pay", value: "stc" },
          { label: "Barq", value: "barq" },
          { label: "Bank Transfer", value: "bank" }
        ])
    );

    return interaction.reply({
      content: t(interaction.user.id, "selectPayment"),
      components: [row],
      ephemeral: true
    });
  }

  // -------------- SELECT PAYMENT --------------
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_payment|")) {
    const parts = interaction.customId.split("|");
    const pid = parts[1];
    const planId = parts[2];
    const payment = interaction.values[0];

    const product = data.products[pid];
    if (!product) {
      return interaction.reply({
        content: t(interaction.user.id, "productNotFound"),
        ephemeral: true
      });
    }
    const plan = product.plans.find((p) => p.id === planId);
    if (!plan) {
      return interaction.reply({
        content: t(interaction.user.id, "planNotFound"),
        ephemeral: true
      });
    }

    const availableKey = (plan.keys || []).find((k) => !k.used);
    if (!availableKey) {
      return interaction.reply({
        content: t(interaction.user.id, "noStock"),
        ephemeral: true
      });
    }

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

    const lang = getLang(interaction.user.id);
    const payCfg = PAYMENT_CONFIG[payment] || {};
    const payNote =
      lang === "ar" ? payCfg.noteAr || "" : payCfg.noteEn || "";

    const embed = new EmbedBuilder()
      .setTitle(t(interaction.user.id, "invoiceTitle") + " #" + invoice)
      .setColor(0x00bfff)
      .addFields(
        { name: "Product / المنتج", value: product.name, inline: true },
        { name: "Plan / المدة", value: plan.name, inline: true },
        { name: "Payment / الدفع", value: payment.toUpperCase(), inline: true }
      )
      .setDescription(
        (payNote ? payNote + "\n\n" : "") + t(interaction.user.id, "sendProof")
      )
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
    } catch (e) {
      console.error("Failed to DM invoice:", e);
    }

    return interaction.reply({
      content: "📨 تم إرسال الفاتورة إلى الخاص.",
      ephemeral: true
    });
  }

  // -------------- APPROVE / REJECT FROM OWNER DM --------------
  if (interaction.isButton() && (interaction.customId.startsWith("approve|") || interaction.customId.startsWith("reject|"))) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "❌ غير مصرح.",
        ephemeral: true
      });
    }

    const parts = interaction.customId.split("|");
    const action = parts[0];
    const invoice = parts[1];
    const order = data.orders[invoice];

    if (!order) {
      return interaction.reply({
        content: "❌ الطلب غير موجود.",
        ephemeral: true
      });
    }

    const product = data.products[order.productId];
    if (!product) {
      return interaction.reply({
        content: "❌ المنتج غير موجود.",
        ephemeral: true
      });
    }
    const plan = product.plans.find((p) => p.id === order.planId);
    if (!plan) {
      return interaction.reply({
        content: "❌ الفترة غير موجودة.",
        ephemeral: true
      });
    }

    if (action === "approve") {
      const keyObj = (plan.keys || []).find((k) => !k.used);
      if (!keyObj) {
        return interaction.reply({
          content: "❌ لا يوجد مفاتيح متاحة.",
          ephemeral: true
        });
      }

      keyObj.used = true;
      order.status = "completed";
      order.key = keyObj.value;
      saveData(data);

      try {
        const user = await client.users.fetch(order.userId);
        await user.send(
          t(order.userId, "orderApproved") +
            "\n```" +
            keyObj.value +
            "```"
        );
        await sendReviewRequest(user, order, product, plan);
      } catch (e) {
        console.error("Failed to DM user key:", e);
      }

      return interaction.update({
        content: "✅ تم قبول الطلب #" + invoice + " وتم تسليم المفتاح.",
        components: []
      });
    }

    if (action === "reject") {
      order.status = "rejected";
      saveData(data);

      try {
        const user = await client.users.fetch(order.userId);
        await user.send(t(order.userId, "orderRejected"));
      } catch (e) {
        console.error("Failed to DM user reject:", e);
      }

      return interaction.update({
        content: "❌ تم رفض الطلب #" + invoice + ".",
        components: []
      });
    }
  }

  // -------------- RATE BUTTONS --------------
  if (interaction.isButton() && interaction.customId.startsWith("rate|")) {
    const parts = interaction.customId.split("|");
    const rating = parts[1];
    const invoice = parts[2];

    const modal = new ModalBuilder()
      .setCustomId("review_modal|" + rating + "|" + invoice)
      .setTitle("إضافة تقييم");

    const comment = new TextInputBuilder()
      .setCustomId("comment")
      .setLabel("اكتب تعليقاً (اختياري)")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(new ActionRowBuilder().addComponents(comment));

    return interaction.showModal(modal);
  }

  // -------------- REVIEW MODAL SUBMIT --------------
  if (interaction.isModalSubmit() && interaction.customId.startsWith("review_modal")) {
    const parts = interaction.customId.split("|");
    const rating = Number(parts[1]);
    const invoice = parts[2];

    const data2 = loadData();
    const order = data2.orders[invoice];
    if (!order) {
      return interaction.reply({
        content: "❌ الطلب غير موجود.",
        ephemeral: true
      });
    }

    const comment =
      interaction.fields.getTextInputValue("comment") || "No comment";

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

    await interaction.reply({
      content: t(order.userId, "reviewReceived"),
      ephemeral: true
    });

    const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
    const product = data2.products[order.productId];
    const plan = product ? product.plans.find((p) => p.id === order.planId) : null;

    const stars = "⭐".repeat(rating);

    const embed = new EmbedBuilder()
      .setTitle(stars + " (" + rating + "/5)")
      .setColor(0xffaa00)
      .addFields(
        { name: "العميل", value: "<@" + order.userId + ">" },
        { name: "المنتج", value: product ? product.name : order.productId },
        { name: "الخدمة", value: plan ? plan.name : order.planId },
        { name: "التعليق", value: comment }
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
});

// =============================================
// ============ PAYMENT PROOF (DM) =============
// =============================================

async function handleDMProof(message) {
  const data = loadData();

  const pending = Object.values(data.orders).filter(
    (o) => o.userId === message.author.id && o.status === "pending"
  );

  if (!pending.length) return message.reply(t(message.author.id, "noOrders"));

  const order = pending[pending.length - 1];
  const product = data.products[order.productId];
  const plan = product ? product.plans.find((p) => p.id === order.planId) : null;

  const owner = await client.users.fetch(OWNER_ID);

  const embed = new EmbedBuilder()
    .setTitle("طلب جديد في انتظار الموافقة")
    .setColor(0xffaa00)
    .addFields(
      { name: "الفاتورة", value: "#" + order.invoice },
      { name: "العميل", value: "<@" + order.userId + ">" },
      {
        name: "الخدمة",
        value:
          (product ? product.name : order.productId) +
          " - " +
          (plan ? plan.name : order.planId)
      },
      { name: "الدفع", value: order.payment.toUpperCase() }
    )
    .setDescription("**الإثبات:**\n" + (message.content || "صورة مرفقة"))
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("approve|" + order.invoice)
      .setLabel("قبول")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("reject|" + order.invoice)
      .setLabel("رفض")
      .setStyle(ButtonStyle.Danger)
  );

  await owner.send({ embeds: [embed], components: [row] });
  await message.reply("⌛ تم استلام الإثبات… بانتظار المراجعة.");
}

// =============================================
// ============ REVIEW REQUEST DM ==============
// =============================================

async function sendReviewRequest(user, order, product, plan) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rate|1|" + order.invoice)
      .setLabel("⭐ 1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("rate|2|" + order.invoice)
      .setLabel("⭐⭐ 2")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("rate|3|" + order.invoice)
      .setLabel("⭐⭐⭐ 3")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("rate|4|" + order.invoice)
      .setLabel("⭐⭐⭐⭐ 4")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("rate|5|" + order.invoice)
      .setLabel("⭐⭐⭐⭐⭐ 5")
      .setStyle(ButtonStyle.Primary)
  );

  await user.send({
    content: t(user.id, "rateExperience"),
    components: [row]
  });
}

// =============================================
// ============== DASHBOARD API ================
// =============================================

const adminSessions = {};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

// health
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// login
app.post("/api/admin/login", (req, res) => {
  const pw = (req.body && req.body.password) || "";
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "wrong_password" });
  }
  const token = createToken();
  adminSessions[token] = { created: Date.now() };
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

// stats
app.get("/api/stats", adminAuth, (req, res) => {
  const data = loadData();
  const totalProducts = Object.keys(data.products).length;
  let totalPlans = 0;
  let totalKeys = 0;
  Object.values(data.products).forEach((p) => {
    totalPlans += (p.plans || []).length;
    (p.plans || []).forEach((pl) => {
      totalKeys += (pl.keys || []).filter((k) => !k.used).length;
    });
  });
  const totalOrders = Object.keys(data.orders).length;
  const totalReviews = data.reviews.length;

  res.json({ totalProducts, totalPlans, totalKeys, totalOrders, totalReviews });
});

// products (for dashboard)
app.get("/api/products", adminAuth, (req, res) => {
  const data = loadData();
  const arr = Object.values(data.products).map((p) => ({
    id: p.id,
    name: p.name,
    plans: (p.plans || []).map((pl) => ({
      id: pl.id,
      name: pl.name,
      price: pl.price,
      stock: (pl.keys || []).filter((k) => !k.used).length
    }))
  }));
  res.json(arr);
});

// create / update product
app.post("/api/products", adminAuth, (req, res) => {
  const body = req.body || {};
  const id = body.id;
  const name = body.name;
  if (!id || !name) return res.status(400).json({ error: "missing_fields" });

  const data = loadData();
  data.products[id] = data.products[id] || { id, plans: [] };
  data.products[id].name = name;
  saveData(data);
  res.json({ ok: true });
});

// create / update plan
app.post("/api/plans", adminAuth, (req, res) => {
  const body = req.body || {};
  const productId = body.productId;
  const planId = body.planId;
  const name = body.name;
  const price =
    typeof body.price === "number" ? body.price : Number(body.price);

  if (!productId || !planId || !name)
    return res.status(400).json({ error: "missing_fields" });

  const data = loadData();
  const product = data.products[productId];
  if (!product) return res.status(404).json({ error: "product_not_found" });

  product.plans = product.plans || [];
  let pl = product.plans.find((p) => p.id === planId);
  if (!pl) {
    pl = { id: planId, name, price: isNaN(price) ? null : price, keys: [] };
    product.plans.push(pl);
  } else {
    pl.name = name;
    if (!isNaN(price)) pl.price = price;
  }

  saveData(data);
  res.json({ ok: true });
});

// add keys to plan
app.post("/api/plans/keys", adminAuth, (req, res) => {
  const body = req.body || {};
  const productId = body.productId;
  const planId = body.planId;
  const keys = Array.isArray(body.keys) ? body.keys : [];

  if (!productId || !planId || !keys.length)
    return res.status(400).json({ error: "missing_fields" });

  const data = loadData();
  const product = data.products[productId];
  if (!product) return res.status(404).json({ error: "product_not_found" });
  const plan = (product.plans || []).find((p) => p.id === planId);
  if (!plan) return res.status(404).json({ error: "plan_not_found" });

  plan.keys = plan.keys || [];
  keys.forEach((k) => {
    if (k && typeof k === "string") {
      plan.keys.push({ value: k.trim(), used: false });
    }
  });

  saveData(data);
  res.json({ ok: true, added: keys.length });
});

// recent orders
app.get("/api/orders", adminAuth, (req, res) => {
  const data = loadData();
  const arr = Object.values(data.orders)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200)
    .map((o) => {
      const product = data.products[o.productId];
      const plan = product
        ? (product.plans || []).find((p) => p.id === o.planId)
        : null;
      return {
        invoice: o.invoice,
        userId: o.userId,
        productId: o.productId,
        productName: product ? product.name : o.productId,
        planId: o.planId,
        planName: plan ? plan.name : o.planId,
        payment: o.payment,
        status: o.status,
        timestamp: o.timestamp
      };
    });

  res.json(arr);
});

// reviews
app.get("/api/reviews", adminAuth, (req, res) => {
  const data = loadData();
  const arr = (data.reviews || [])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((r) => {
      const product = data.products[r.productId];
      const plan = product
        ? (product.plans || []).find((p) => p.id === r.planId)
        : null;
      return {
        userId: r.userId,
        productId: r.productId,
        productName: product ? product.name : r.productId,
        planId: r.planId,
        planName: plan ? plan.name : r.planId,
        rating: r.rating,
        comment: r.comment,
        timestamp: r.timestamp
      };
    });

  res.json(arr);
});

// =============================================
// ============== DASHBOARD HTML ===============
// =============================================

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>P9 Shop Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    min-height:100vh;
    background: radial-gradient(circle at top left,#1d4ed8 0,#020617 40%,#020617 100%);
    color:#e5e7eb;
  }
  .center {
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:16px;
  }
  .card {
    background:rgba(15,23,42,0.96);
    border-radius:22px;
    box-shadow:0 24px 80px rgba(15,23,42,0.95);
    border:1px solid rgba(148,163,184,0.35);
    max-width:1100px;
    width:100%;
    padding:22px 24px;
    position:relative;
    overflow:hidden;
  }
  .glow {
    position:absolute;
    width:260px;
    height:260px;
    border-radius:999px;
    background:radial-gradient(circle,#f97316 0,#4f46e5 40%,transparent 70%);
    opacity:0.45;
    top:-60px;
    right:-60px;
    filter:blur(1px);
    pointer-events:none;
  }
  .badge {
    display:inline-flex;
    align-items:center;
    gap:6px;
    font-size:11px;
    background:rgba(22,163,74,0.1);
    color:#4ade80;
    padding:4px 10px;
    border-radius:999px;
    border:1px solid rgba(34,197,94,0.5);
    margin-bottom:10px;
  }
  .badge-dot {
    width:8px;
    height:8px;
    border-radius:999px;
    background:#22c55e;
    box-shadow:0 0 0 5px rgba(34,197,94,0.4);
  }
  h1 { font-size:24px; margin-bottom:4px; }
  p.lead { font-size:13px; color:#9ca3af; margin-bottom:12px; }
  .layout {
    display:flex;
    gap:18px;
    margin-top:10px;
  }
  .sidebar {
    width:230px;
    border-radius:18px;
    background:rgba(15,23,42,0.96);
    border:1px solid rgba(148,163,184,0.3);
    padding:12px;
  }
  .sidebar-title {
    font-size:14px;
    font-weight:600;
    margin-bottom:8px;
    color:#9ca3af;
  }
  .nav-btn {
    width:100%;
    display:flex;
    align-items:center;
    gap:8px;
    padding:7px 10px;
    border-radius:10px;
    border:none;
    background:transparent;
    color:#e5e7eb;
    font-size:13px;
    cursor:pointer;
    margin-bottom:4px;
  }
  .nav-btn span.icon { font-size:16px; }
  .nav-btn.active {
    background:linear-gradient(90deg,rgba(56,189,248,0.06),rgba(129,140,248,0.08));
    box-shadow:0 0 0 1px rgba(56,189,248,0.7);
  }
  .nav-footer {
    border-top:1px solid #111827;
    margin-top:8px;
    padding-top:8px;
    font-size:11px;
    color:#9ca3af;
  }
  .main {
    flex:1;
    min-width:0;
    border-radius:18px;
    background:rgba(15,23,42,0.96);
    border:1px solid rgba(148,163,184,0.3);
    padding:14px 16px;
  }
  .main-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:8px;
  }
  .main-header h2 { font-size:18px; }
  .main-header small { font-size:11px; color:#9ca3af; }
  .btn {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:7px 13px;
    border-radius:999px;
    border:none;
    font-size:12px;
    cursor:pointer;
    font-weight:500;
  }
  .btn-primary { background:#06b6d4; color:#0b1120; }
  .btn-primary:hover { background:#0ea5e9; }
  .btn-ghost {
    background:transparent;
    border:1px solid #4b5563;
    color:#e5e7eb;
  }
  .btn-ghost:hover { border-color:#9ca3af; }
  .btn-danger { background:#ef4444; color:#0b1120; }
  .btn-danger:hover { background:#f97373; }

  .login {
    margin-top:10px;
    display:flex;
    gap:8px;
    align-items:center;
  }
  .login input {
    flex:1;
    padding:7px 10px;
    border-radius:999px;
    border:1px solid #4b5563;
    background:rgba(15,23,42,0.9);
    color:#e5e7eb;
    font-size:12px;
  }
  .login-status { font-size:11px; margin-top:6px; color:#9ca3af; }
  .status-ok { color:#4ade80; }
  .status-bad { color:#f97373; }

  .hidden { display:none !important; }

  .stat-grid {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:10px;
    margin-top:6px;
  }
  .stat-card {
    border-radius:12px;
    background:radial-gradient(circle at top left,rgba(56,189,248,0.08),rgba(15,23,42,0.95));
    border:1px solid rgba(148,163,184,0.3);
    padding:10px 12px;
  }
  .stat-card h3 {
    font-size:11px;
    color:#9ca3af;
    text-transform:uppercase;
    letter-spacing:0.08em;
    margin-bottom:4px;
  }
  .stat-card .value {
    font-size:22px;
    font-weight:700;
  }

  .views .view { display:none; margin-top:10px; }
  .views .view.active { display:block; }

  .field { margin-bottom:7px; }
  .field label { display:block; font-size:11px; color:#9ca3af; margin-bottom:3px; }
  .field input, .field textarea {
    width:100%;
    padding:7px 8px;
    border-radius:8px;
    border:1px solid #4b5563;
    background:#020617;
    color:#e5e7eb;
    font-size:12px;
  }
  .field textarea { min-height:70px; resize:vertical; }

  .two-col {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:10px;
  }

  table {
    width:100%;
    border-collapse:collapse;
    font-size:12px;
    margin-top:6px;
  }
  th, td {
    padding:6px 8px;
    border-bottom:1px solid #111827;
  }
  th {
    text-align:left;
    font-weight:500;
    color:#9ca3af;
    background:rgba(15,23,42,0.95);
  }
  tr:hover td { background:#020617; }

  .tag {
    display:inline-flex;
    align-items:center;
    padding:2px 8px;
    border-radius:999px;
    font-size:10px;
  }
  .tag-pending { background:#f97316; color:#111827; }
  .tag-completed { background:#22c55e; color:#052e16; }
  .tag-rejected { background:#ef4444; color:#450a0a; }

  .cards {
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:10px;
  }
  .mini-card {
    border-radius:12px;
    padding:10px;
    background:rgba(15,23,42,0.96);
    border:1px solid rgba(75,85,99,0.8);
    font-size:12px;
  }
  .mini-card .stars { color:#eab308; margin-bottom:4px; }
  .mini-card .small { font-size:11px; color:#9ca3af; }

  @media (max-width:900px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; display:flex; overflow-x:auto; }
    .nav-btn { flex:1; white-space:nowrap; }
  }
</style>
</head>
<body>
<div class="center">
  <div class="card">
    <div class="glow"></div>
    <div class="badge">
      <span class="badge-dot"></span>
      <span>Bot &amp; API Online</span>
    </div>
    <h1>P9 Shop Dashboard</h1>
    <p class="lead">
      Space Neon panel for P9 Shop. Manage <b>products</b>, <b>plans (day / 3 days / week)</b>, keys, orders and reviews – all from this instance.
    </p>

    <!-- Login row -->
    <div id="loginBox">
      <div class="login">
        <input id="pwInput" type="password" placeholder="Admin password (ADMIN_PASSWORD)" />
        <button class="btn btn-primary" onclick="login()">Login</button>
        <button class="btn btn-ghost" onclick="checkHealth()">Ping</button>
      </div>
      <div id="loginStatus" class="login-status">
        Status: <span class="status-bad">Logged out</span>
      </div>
    </div>

    <!-- Layout -->
    <div id="dashboard" class="layout hidden" style="margin-top:16px;">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-title">Navigation</div>
        <button class="nav-btn active" data-view="stats" onclick="setView('stats')">
          <span class="icon">📊</span><span>Stats</span>
        </button>
        <button class="nav-btn" data-view="products" onclick="setView('products')">
          <span class="icon">📦</span><span>Products & Plans</span>
        </button>
        <button class="nav-btn" data-view="orders" onclick="setView('orders')">
          <span class="icon">🧾</span><span>Orders</span>
        </button>
        <button class="nav-btn" data-view="reviews" onclick="setView('reviews')">
          <span class="icon">⭐</span><span>Reviews</span>
        </button>
        <div style="margin-top:10px;">
          <button class="btn btn-primary" style="width:100%;margin-bottom:6px;" onclick="refreshCurrent()">Refresh</button>
          <button class="btn btn-danger" style="width:100%;" onclick="logout()">Logout</button>
        </div>
        <div class="nav-footer" id="sidebarStatus">API: ready</div>
      </aside>

      <!-- Main -->
      <main class="main">
        <div class="main-header">
          <h2 id="viewTitle">Stats</h2>
          <small id="lastUpdated">–</small>
        </div>

        <div class="views">
          <!-- Stats view -->
          <section id="view-stats" class="view active">
            <div class="stat-grid">
              <div class="stat-card">
                <h3>Products</h3>
                <div class="value" id="statProducts">-</div>
              </div>
              <div class="stat-card">
                <h3>Plans</h3>
                <div class="value" id="statPlans">-</div>
              </div>
              <div class="stat-card">
                <h3>Keys in stock</h3>
                <div class="value" id="statKeys">-</div>
              </div>
              <div class="stat-card">
                <h3>Orders</h3>
                <div class="value" id="statOrders">-</div>
              </div>
              <div class="stat-card">
                <h3>Reviews</h3>
                <div class="value" id="statReviews">-</div>
              </div>
            </div>
          </section>

          <!-- Products view -->
          <section id="view-products" class="view">
            <div class="two-col">
              <div>
                <h3 style="font-size:13px;margin-bottom:4px;">Add / Edit Product</h3>
                <div class="field">
                  <label>Product ID</label>
                  <input id="p_id" placeholder="e.g. cod" />
                </div>
                <div class="field">
                  <label>Name</label>
                  <input id="p_name" placeholder="e.g. Call of Duty Unlock" />
                </div>
                <button class="btn btn-primary" onclick="addProduct()">Save Product</button>
              </div>
              <div>
                <h3 style="font-size:13px;margin-bottom:4px;">Add / Edit Plan (time)</h3>
                <div class="field">
                  <label>Product ID</label>
                  <input id="pl_pid" placeholder="cod" />
                </div>
                <div class="field">
                  <label>Plan ID</label>
                  <input id="pl_id" placeholder="1d / 3d / week" />
                </div>
                <div class="field">
                  <label>Plan Name</label>
                  <input id="pl_name" placeholder="1 Day / 3 Days / 1 Week" />
                </div>
                <div class="field">
                  <label>Price (optional)</label>
                  <input id="pl_price" type="number" step="0.01" placeholder="10.00" />
                </div>
                <button class="btn btn-primary" onclick="addPlan()">Save Plan</button>
              </div>
            </div>

            <div style="margin-top:12px;">
              <h3 style="font-size:13px;margin-bottom:4px;">Add Keys to Plan</h3>
              <div class="two-col">
                <div>
                  <div class="field">
                    <label>Product ID</label>
                    <input id="k_pid" placeholder="cod" />
                  </div>
                  <div class="field">
                    <label>Plan ID</label>
                    <input id="k_plid" placeholder="1d / 3d / week" />
                  </div>
                </div>
                <div>
                  <div class="field">
                    <label>Keys (one per line)</label>
                    <textarea id="k_values" placeholder="KEY-1&#10;KEY-2&#10;KEY-3"></textarea>
                  </div>
                </div>
              </div>
              <button class="btn btn-primary" style="margin-top:4px;" onclick="addKeys()">Add Keys</button>
            </div>

            <div style="margin-top:14px;">
              <h3 style="font-size:13px;margin-bottom:4px;">Products / Plans / Stock</h3>
              <table id="productsTable">
                <thead>
                  <tr>
                    <th style="width:120px;">Product</th>
                    <th>Plan</th>
                    <th style="width:80px;">Price</th>
                    <th style="width:70px;">Stock</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <!-- Orders view -->
          <section id="view-orders" class="view">
            <h3 style="font-size:13px;margin-bottom:4px;">Recent Orders</h3>
            <table id="ordersTable">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>User</th>
                  <th>Product</th>
                  <th>Plan</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </section>

          <!-- Reviews view -->
          <section id="view-reviews" class="view">
            <h3 style="font-size:13px;margin-bottom:4px;">Latest Reviews</h3>
            <div id="reviewsContainer" class="cards"></div>
          </section>
        </div>
      </main>
    </div>
  </div>
</div>

<script>
let token = null;
let currentView = "stats";

function setLoginStatus(msg, ok) {
  var el = document.getElementById("loginStatus");
  el.innerHTML =
    'Status: <span class="' +
    (ok ? "status-ok" : "status-bad") +
    '">' +
    msg +
    "</span>";
}

function checkHealth() {
  fetch("/api/health")
    .then(function (r) {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then(function () {
      setLoginStatus("Backend OK", true);
    })
    .catch(function () {
      setLoginStatus("Backend error", false);
    });
}

async function login() {
  var pw = document.getElementById("pwInput").value;
  if (!pw) {
    setLoginStatus("Enter password first", false);
    return;
  }
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) {
      setLoginStatus("Invalid password", false);
      return;
    }
    const data = await res.json();
    token = data.token;
    setLoginStatus("Logged in", true);
    document.getElementById("dashboard").classList.remove("hidden");
  } catch (e) {
    console.error(e);
    setLoginStatus("Login error", false);
  }
}

function logout() {
  token = null;
  document.getElementById("dashboard").classList.add("hidden");
  setLoginStatus("Logged out", false);
}

function setView(view) {
  currentView = view;
  document.getElementById("viewTitle").textContent =
    view === "stats"
      ? "Stats"
      : view === "products"
      ? "Products & Plans"
      : view === "orders"
      ? "Orders"
      : view === "reviews"
      ? "Reviews"
      : view;

  var vs = document.querySelectorAll(".view");
  vs.forEach(function (v) {
    v.classList.remove("active");
  });
  var active = document.getElementById("view-" + view);
  if (active) active.classList.add("active");

  var btns = document.querySelectorAll(".nav-btn");
  btns.forEach(function (b) {
    b.classList.remove("active");
  });
  var btn = document.querySelector('.nav-btn[data-view="' + view + '"]');
  if (btn) btn.classList.add("active");

  var d = new Date();
  document.getElementById("lastUpdated").textContent =
    "Last refresh: " + d.toLocaleString();

  if (view === "stats") loadStats();
  if (view === "products") loadProducts();
  if (view === "orders") loadOrders();
  if (view === "reviews") loadReviews();
}

function refreshCurrent() {
  setView(currentView);
}

async function authedFetch(url, options) {
  if (!token) throw new Error("Not logged in");
  options = options || {};
  options.headers = options.headers || {};
  options.headers["Authorization"] = "Bearer " + token;
  return fetch(url, options);
}

// ==== Stats ====
async function loadStats() {
  try {
    const res = await authedFetch("/api/stats");
    const s = await res.json();
    document.getElementById("statProducts").textContent = s.totalProducts;
    document.getElementById("statPlans").textContent = s.totalPlans;
    document.getElementById("statKeys").textContent = s.totalKeys;
    document.getElementById("statOrders").textContent = s.totalOrders;
    document.getElementById("statReviews").textContent = s.totalReviews;
  } catch (e) {
    console.error(e);
  }
}

// ==== Products / Plans ====
async function loadProducts() {
  try {
    const res = await authedFetch("/api/products");
    const arr = await res.json();
    var tbody = document.querySelector("#productsTable tbody");
    tbody.innerHTML = "";
    arr.forEach(function (p) {
      if (!p.plans || !p.plans.length) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          p.name +
          " (" +
          p.id +
          ")</td><td>-</td><td>-</td><td>-</td>";
        tbody.appendChild(tr);
      } else {
        p.plans.forEach(function (pl) {
          var tr2 = document.createElement("tr");
          tr2.innerHTML =
            "<td>" +
            p.name +
            " (" +
            p.id +
            ")</td>" +
            "<td>" +
            pl.name +
            " [" +
            pl.id +
            "]</td>" +
            "<td>" +
            (pl.price != null ? pl.price : "-") +
            "</td>" +
            "<td>" +
            pl.stock +
            "</td>";
          tbody.appendChild(tr2);
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function addProduct() {
  if (!token) return alert("Login first");
  var id = document.getElementById("p_id").value.trim();
  var name = document.getElementById("p_name").value.trim();
  if (!id || !name) {
    alert("Fill product id & name");
    return;
  }
  try {
    const res = await authedFetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, name: name })
    });
    if (!res.ok) {
      alert("Error saving product");
      return;
    }
    document.getElementById("p_id").value = "";
    document.getElementById("p_name").value = "";
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addPlan() {
  if (!token) return alert("Login first");
  var pid = document.getElementById("pl_pid").value.trim();
  var id = document.getElementById("pl_id").value.trim();
  var name = document.getElementById("pl_name").value.trim();
  var priceRaw = document.getElementById("pl_price").value.trim();
  var price = priceRaw ? Number(priceRaw) : null;

  if (!pid || !id || !name) {
    alert("Fill product id, plan id and name");
    return;
  }

  try {
    const res = await authedFetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: pid, planId: id, name: name, price: price })
    });
    if (!res.ok) {
      alert("Error saving plan");
      return;
    }
    document.getElementById("pl_pid").value = "";
    document.getElementById("pl_id").value = "";
    document.getElementById("pl_name").value = "";
    document.getElementById("pl_price").value = "";
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addKeys() {
  if (!token) return alert("Login first");
  var pid = document.getElementById("k_pid").value.trim();
  var plid = document.getElementById("k_plid").value.trim();
  var raw = document.getElementById("k_values").value.trim();
  if (!pid || !plid || !raw) {
    alert("Fill product id, plan id and keys");
    return;
  }
  var lines = raw.split("\\n");
  var keys = [];
  for (var i = 0; i < lines.length; i++) {
    var v = lines[i].trim();
    if (v) keys.push(v);
  }
  if (!keys.length) {
    alert("No keys");
    return;
  }
  try {
    const res = await authedFetch("/api/plans/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: pid, planId: plid, keys: keys })
    });
    if (!res.ok) {
      alert("Error adding keys");
      return;
    }
    document.getElementById("k_pid").value = "";
    document.getElementById("k_plid").value = "";
    document.getElementById("k_values").value = "";
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

// ==== Orders ====
async function loadOrders() {
  if (!token) return;
  try {
    const res = await authedFetch("/api/orders");
    const arr = await res.json();
    var tbody = document.querySelector("#ordersTable tbody");
    tbody.innerHTML = "";
    arr.forEach(function (o) {
      var cls =
        o.status === "completed"
          ? "tag tag-completed"
          : o.status === "rejected"
          ? "tag tag-rejected"
          : "tag tag-pending";
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td># " +
        o.invoice +
        "</td>" +
        "<td>" +
        o.userId +
        "</td>" +
        "<td>" +
        o.productName +
        "</td>" +
        "<td>" +
        o.planName +
        "</td>" +
        "<td>" +
        o.payment.toUpperCase() +
        "</td>" +
        '<td><span class="' +
        cls +
        '">' +
        o.status +
        "</span></td>";
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

// ==== Reviews ====
async function loadReviews() {
  if (!token) return;
  try {
    const res = await authedFetch("/api/reviews");
    const arr = await res.json();
    var container = document.getElementById("reviewsContainer");
    container.innerHTML = "";
    if (!arr.length) {
      container.innerHTML =
        '<div class="mini-card"><span class="small">No reviews yet.</span></div>';
      return;
    }
    arr.forEach(function (r) {
      var card = document.createElement("div");
      card.className = "mini-card";
      var stars = "";
      for (var i = 0; i < r.rating; i++) stars += "⭐";
      card.innerHTML =
        '<div class="stars">' +
        stars +
        " (" +
        r.rating +
        "/5)</div>" +
        '<div class="small">User: ' +
        r.userId +
        "</div>" +
        '<div class="small">Product: ' +
        r.productName +
        " / " +
        r.planName +
        "</div>" +
        '<div style="margin-top:6px;font-size:12px;">' +
        (r.comment || "No comment") +
        "</div>" +
        '<div class="small" style="margin-top:4px;">' +
        new Date(r.timestamp).toLocaleString() +
        "</div>";
      container.appendChild(card);
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
  console.log("🌐 Dashboard running on port " + PORT);
});

client.login(TOKEN);
