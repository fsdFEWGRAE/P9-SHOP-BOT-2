// ============ IMPORTS ============

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

// ============ إعداد البوت ============

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

const PREFIX = "-";
const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const PORT = process.env.BOT_PORT || process.env.PORT || 5050;

// ============ الترجمة ============

const translations = {
    en: {
        productAdded: "Product added successfully!",
        keyAdded: "Key added!",
        productNotFound: "Product not found!",
        selectProduct: "Select a product:",
        selectPlan: "Select your plan:",
        selectPayment: "Select your payment method:",
        noProducts: "No products available!",
        noStock: "No keys available for this plan!",
        invoiceTitle: "Payment Invoice",
        invoiceNumber: "Invoice Number",
        product: "Product",
        plan: "Plan",
        price: "Price",
        paymentMethod: "Payment Method",
        sendProof: "Please send your payment proof.",
        proofReceived: "Payment proof received!",
        orderApproved: "Your order has been approved:",
        orderRejected: "Your order has been rejected.",
        approveOrder: "Approve",
        rejectOrder: "Reject",
        rateExperience: "Please rate your experience:",
        reviewReceived: "Thanks for your review!"
    },

    ar: {
        productAdded: "تم إضافة المنتج!",
        keyAdded: "تم إضافة المفتاح!",
        productNotFound: "المنتج غير موجود!",
        selectProduct: "اختر المنتج:",
        selectPlan: "اختر المدة:",
        selectPayment: "اختر طريقة الدفع:",
        noProducts: "لا توجد منتجات!",
        noStock: "لا توجد مفاتيح لهذه المدة!",
        invoiceTitle: "فاتورة الدفع",
        invoiceNumber: "رقم الفاتورة",
        product: "المنتج",
        plan: "المدة",
        price: "السعر",
        paymentMethod: "طريقة الدفع",
        sendProof: "أرسل إثبات الدفع.",
        proofReceived: "تم استلام إثبات الدفع!",
        orderApproved: "تمت الموافقة على طلبك:",
        orderRejected: "تم رفض طلبك.",
        approveOrder: "قبول",
        rejectOrder: "رفض",
        rateExperience: "يرجى تقييم تجربتك:",
        reviewReceived: "شكراً على تقييمك!"
    }
};

// ============ قراءة البيانات ============

function loadData() {
    try {
        const raw = fs.readFileSync("data.json", "utf8");
        const data = JSON.parse(raw);

        data.products ??= {};
        data.orders ??= {};
        data.invoiceCounter ??= 1000;
        data.userLanguages ??= {};
        data.reviews ??= {};
        return data;
    } catch (e) {
        return {
            products: {},
            orders: {},
            invoiceCounter: 1000,
            userLanguages: {},
            reviews: []
        };
    }
}

function saveData(data) {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getLang(uid) {
    const data = loadData();
    return data.userLanguages[uid] || "ar";
}

function t(uid, key, vars = {}) {
    let txt = translations[getLang(uid)][key] || key;
    for (const v in vars) txt = txt.replace(`{${v}}`, vars[v]);
    return txt;
}

// ============ READY ============

client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});
// ====== إعادة ضبط/تطبيع البيانات لتدعم الـ plans ======
function normalizeData(data) {
  data.products = data.products || {};
  data.orders = data.orders || {};
  data.invoiceCounter = data.invoiceCounter || 1000;
  data.userLanguages = data.userLanguages || {};
  data.reviews = data.reviews || [];

  for (const p of Object.values(data.products)) {
    p.plans = p.plans || {};
    for (const plan of Object.values(p.plans)) {
      plan.keys = plan.keys || [];
    }
  }
  return data;
}

// نعيد تعريف loadData و saveData و t عشان نضمن الـ plans
function loadData() {
  try {
    const raw = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(raw);
    return normalizeData(data);
  } catch (e) {
    const data = {
      products: {},
      orders: {},
      invoiceCounter: 1000,
      userLanguages: {},
      reviews: []
    };
    return normalizeData(data);
  }
}

function saveData(data) {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getLang(uid) {
  const data = loadData();
  return data.userLanguages[uid] || "ar";
}

function t(uid, key, vars = {}) {
  let txt = (translations[getLang(uid)] || translations.ar)[key] || key;
  for (const k in vars) txt = txt.replace(`{${k}}`, vars[k]);
  return txt;
}

// ====== MESSAGE HANDLER ======
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // لو مو أمر وفي الخاص → إثبات دفع
  if (!message.content.startsWith(PREFIX)) {
    if (message.channel.type === 1 /* DM */) {
      handleDMProof(message);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // ---------- help ----------
  if (command === "help") {
    return message.reply(
      [
        "📜 **الأوامر المتاحة:**",
        "",
        "-help",
        "-lang en / ar",
        "",
        "👑 **أوامر المالك:**",
        "-addproduct id | name",
        "-addplan productId | planId | label | price",
        "-addkey productId | planId | keyValue",
        "-stock",
        "",
        "🛒 **الشراء:**",
        "-buy"
      ].join("\n")
    );
  }

  // ---------- lang ----------
  if (command === "lang") {
    const lang = args[0]?.toLowerCase();
    if (!["en", "ar"].includes(lang)) {
      return message.reply("Usage: -lang en / ar");
    }
    const data = loadData();
    data.userLanguages[message.author.id] = lang;
    saveData(data);
    return message.reply(t(message.author.id, "languageChanged"));
  }

  // باقي الأوامر للـ OWNER فقط
  const isOwner = message.author.id === process.env.OWNER_ID;

  // ---------- addproduct ----------
  if (command === "addproduct") {
    if (!isOwner) return;

    const parts = message.content
      .slice(PREFIX.length + "addproduct".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      return message.reply("Usage: -addproduct id | name");
    }

    const [id, name] = parts;
    const data = loadData();

    if (!data.products[id]) {
      data.products[id] = {
        id,
        name,
        plans: {}
      };
    } else {
      data.products[id].name = name;
    }

    saveData(data);
    return message.reply(t(message.author.id, "productAdded"));
  }

  // ---------- addplan ----------
  // مثال: -addplan bo6 | month | شهر واحد | 20
  if (command === "addplan") {
    if (!isOwner) return;

    const parts = message.content
      .slice(PREFIX.length + "addplan".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 4) {
      return message.reply(
        "Usage: -addplan productId | planId | label | price\nمثال: -addplan bo6 | month | شهر واحد | 20"
      );
    }

    const [productId, planId, label, priceStr] = parts;
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      return message.reply("السعر غير صحيح.");
    }

    const data = loadData();
    const product = data.products[productId];

    if (!product) {
      return message.reply(t(message.author.id, "productNotFound"));
    }

    product.plans = product.plans || {};
    product.plans[planId] = product.plans[planId] || {
      id: planId,
      label,
      price,
      keys: []
    };
    product.plans[planId].label = label;
    product.plans[planId].price = price;

    saveData(data);
    return message.reply(
      `✅ تم إضافة/تحديث الخطة **${planId}** (${label}) للمنتج **${product.name}** بسعر ${price}.`
    );
  }

  // ---------- addkey ----------
  // مثال: -addkey bo6 | month | KEY-XXXX
  if (command === "addkey") {
    if (!isOwner) return;

    const parts = message.content
      .slice(PREFIX.length + "addkey".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 3) {
      return message.reply("Usage: -addkey productId | planId | keyValue");
    }

    const [productId, planId, keyValue] = parts;
    const data = loadData();
    const product = data.products[productId];

    if (!product) {
      return message.reply(t(message.author.id, "productNotFound"));
    }

    product.plans = product.plans || {};
    const plan = product.plans[planId];

    if (!plan) {
      return message.reply("هذه الخطة غير موجودة لهذا المنتج. استخدم -addplan أولاً.");
    }

    plan.keys = plan.keys || [];
    plan.keys.push({ value: keyValue, used: false });

    saveData(data);
    return message.reply(t(message.author.id, "keyAdded"));
  }

  // ---------- stock ----------
  if (command === "stock") {
    const data = loadData();
    const products = Object.values(data.products);

    if (products.length === 0) {
      return message.reply("❌ لا توجد منتجات حالياً.");
    }

    let msg = "📦 **حالة المخزون:**\n\n";

    for (const p of products) {
      msg += `🛒 **${p.name}** — (${p.id})\n`;

      const plans = Object.values(p.plans || {});
      if (plans.length === 0) {
        msg += "   لا توجد فترات (plans) مضافة.\n\n";
        continue;
      }

      for (const pl of plans) {
        const stock = (pl.keys || []).filter((k) => !k.used).length;

        let color = "🟩"; // ممتاز
        if (stock === 0) color = "🟥"; // منتهي
        else if (stock < 5) color = "🟧"; // قليل

        msg += `   ${color} **${pl.label}** \`(${pl.id})\` — ${pl.price}\n`;
        msg += `      🗝️ Keys: **${stock}**\n`;
      }

      msg += "\n";
    }

    return message.reply(msg);
  }

  // ---------- buy ----------
  if (command === "buy") {
    const data = loadData();
    const products = Object.values(data.products);

    if (products.length === 0) {
      return message.reply(t(message.author.id, "noProducts"));
    }

    const options = products.map((p) => {
      let totalStock = 0;
      for (const pl of Object.values(p.plans || {})) {
        totalStock += (pl.keys || []).filter((k) => !k.used).length;
      }
      return {
        label: p.name,
        description: `ID: ${p.id} • Stock: ${totalStock}`,
        value: p.id
      };
    });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("buy_product")
        .setPlaceholder(t(message.author.id, "selectProduct"))
        .addOptions(options)
    );

    return message.reply({
      content: t(message.author.id, "selectProduct"),
      components: [row]
    });
  }
});
// ====== INTERACTION HANDLER ======
client.on("interactionCreate", async (interaction) => {
  // ----------------- اختيار المنتج -----------------
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "buy_product") {
      const productId = interaction.values[0];
      const data = loadData();
      const product = data.products[productId];

      if (!product) {
        return interaction.reply({ content: "❌ المنتج غير موجود.", ephemeral: true });
      }

      const plans = Object.values(product.plans || {});
      if (plans.length === 0) {
        return interaction.reply({
          content: "❌ لا توجد فترات (خطط) لهذا المنتج.",
          ephemeral: true
        });
      }

      const options = plans.map((pl) => {
        const stock = (pl.keys || []).filter((k) => !k.used).length;
        return {
          label: `${pl.label} - ${pl.price}`,
          description: `Stock: ${stock} • Plan ID: ${pl.id}`,
          value: `${productId}|${pl.id}`
        };
      });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("buy_plan")
          .setPlaceholder("اختر الفترة (الخطة)")
          .addOptions(options)
      );

      return interaction.reply({
        content: "📆 **اختر مدة الاشتراك:**",
        components: [row],
        ephemeral: true
      });
    }

    // ----------------- اختيار الخطة (المدة) -----------------
    if (interaction.customId === "buy_plan") {
      const [productId, planId] = interaction.values[0].split("|");
      const data = loadData();
      const product = data.products[productId];
      const plan = product.plans[planId];

      const stock = plan.keys.filter((k) => !k.used).length;
      if (stock === 0) {
        return interaction.reply({ content: "❌ لا يوجد مخزون لهذه الخطة.", ephemeral: true });
      }

      const methods = [
        { label: "PayPal", value: "paypal" },
        { label: "STC Pay", value: "stc" },
        { label: "Barq", value: "barq" },
        { label: "Gift Card", value: "gift" },
        { label: "Bank Transfer", value: "bank" }
      ];

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`payment_${productId}_${planId}`)
          .setPlaceholder("اختر طريقة الدفع")
          .addOptions(methods)
      );

      return interaction.reply({
        content: "💳 **اختر وسيلة الدفع:**",
        components: [row],
        ephemeral: true
      });
    }

    // ----------------- اختيار وسيلة الدفع -----------------
    if (interaction.customId.startsWith("payment_")) {
      const [_, productId, planId] = interaction.customId.split("_");
      const paymentMethod = interaction.values[0];

      const data = loadData();
      const product = data.products[productId];
      const plan = product.plans[planId];

      const invoice = data.invoiceCounter++;
      const finalPrice = plan.price;

      data.orders[invoice] = {
        invoiceNumber: invoice,
        userId: interaction.user.id,
        productId,
        planId,
        paymentMethod,
        price: finalPrice,
        status: "pending",
        timestamp: Date.now()
      };

      saveData(data);

      // === إرسال الفاتورة في الخاص ===
      const embed = new EmbedBuilder()
        .setTitle("🧾 فاتورة الدفع")
        .setColor(0x00aaff)
        .addFields(
          { name: "رقم الفاتورة", value: `#${invoice}`, inline: true },
          { name: "المنتج", value: product.name, inline: true },
          { name: "الخطة", value: plan.label, inline: true },
          { name: "السعر", value: `${finalPrice}`, inline: true },
          { name: "طريقة الدفع", value: paymentMethod.toUpperCase(), inline: true }
        )
        .setFooter({ text: "📤 يرجى إرسال إثبات الدفع هنا" });

      await interaction.user.send({ embeds: [embed] });

      return interaction.reply({
        content: "📨 تم إرسال الفاتورة في الخاص.",
        ephemeral: true
      });
    }
  }

  // ----------------- زر القبول -----------------
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("approve_")) {
      if (interaction.user.id !== process.env.OWNER_ID) {
        return interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true });
      }

      const invoice = interaction.customId.split("_")[1];
      const data = loadData();
      const order = data.orders[invoice];

      const product = data.products[order.productId];
      const plan = product.plans[order.planId];
      const key = plan.keys.find((k) => !k.used);

      if (!key) {
        return interaction.reply({ content: "❌ لا يوجد مفتاح متاح.", ephemeral: true });
      }

      key.used = true;
      order.status = "completed";
      order.keyDelivered = key.value;

      saveData(data);

      const user = await client.users.fetch(order.userId);
      await user.send(`✅ **تم قبول طلبك!**\nالمفتاح:\n\`\`\`${key.value}\`\`\``);

      await interaction.update({
        content: `✅ تم قبول الطلب #${invoice}`,
        components: []
      });

      sendReviewRequest(user, order, plan, product);
    }

    // ----------------- زر الرفض -----------------
    if (interaction.customId.startsWith("reject_")) {
      if (interaction.user.id !== process.env.OWNER_ID) {
        return interaction.reply({ content: "❌ ليس لديك صلاحية.", ephemeral: true });
      }

      const invoice = interaction.customId.split("_")[1];
      const data = loadData();
      const order = data.orders[invoice];
      order.status = "rejected";
      saveData(data);

      const user = await client.users.fetch(order.userId);
      await user.send("❌ تم رفض الطلب.");

      await interaction.update({
        content: `❌ تم رفض الطلب #${invoice}`,
        components: []
      });
    }
  }

  // ----------------- إرسال تقييم -----------------
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("review_")) {
      const [_, stars, invoice] = interaction.customId.split("_");
      const comment = interaction.fields.getTextInputValue("comment") || "No comment";

      const data = loadData();
      const order = data.orders[invoice];
      const product = data.products[order.productId];
      const plan = product.plans[order.planId];

      data.reviews.push({
        userId: interaction.user.id,
        productId: order.productId,
        planId: order.planId,
        rating: parseInt(stars),
        comment,
        timestamp: Date.now()
      });

      saveData(data);

      const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle(`⭐ تقييم جديد — ${stars}/5`)
        .setColor(0xffd700)
        .addFields(
          { name: "العميل", value: `<@${interaction.user.id}>` },
          { name: "المنتج", value: product.name },
          { name: "الخطة", value: plan.label },
          { name: "التقييم", value: `${"⭐".repeat(stars)}` },
          { name: "التعليق", value: comment }
        )
        .setTimestamp();

      channel.send({ embeds: [embed] });

      return interaction.reply({
        content: "شكراً على تقييمك! ⭐",
        ephemeral: true
      });
    }
  }
});
// ======================= DM PROOF HANDLER =======================
async function handleDMProof(message) {
  const data = loadData();
  const pending = Object.values(data.orders).filter(
    (o) => o.userId === message.author.id && o.status === "pending"
  );

  if (pending.length === 0) return;

  const order = pending[pending.length - 1];
  const product = data.products[order.productId];
  const plan = product.plans[order.planId];

  const owner = await client.users.fetch(process.env.OWNER_ID);

  const embed = new EmbedBuilder()
    .setTitle("🟠 طلب جديد بانتظار الموافقة")
    .setColor(0xff9900)
    .addFields(
      { name: "رقم الفاتورة", value: `#${order.invoiceNumber}`, inline: true },
      { name: "العميل", value: `<@${order.userId}>`, inline: true },
      { name: "المنتج", value: product.name, inline: true },
      { name: "الخطة", value: plan.label, inline: true },
      { name: "السعر", value: `${order.price}`, inline: true },
      { name: "طريقة الدفع", value: order.paymentMethod.toUpperCase(), inline: true }
    )
    .setDescription(
      `**إثبات الدفع:**\n${message.content || "تم إرسال صورة"}`
    )
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${order.invoiceNumber}`)
      .setLabel("قبول الطلب")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${order.invoiceNumber}`)
      .setLabel("رفض الطلب")
      .setStyle(ButtonStyle.Danger)
  );

  await owner.send({
    embeds: [embed],
    components: [row]
  });

  await message.reply("📨 تم إرسال إثبات الدفع! في انتظار الموافقة.");
}

// ======================= SEND REVIEW REQUEST =======================
async function sendReviewRequest(user, order, plan, product) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rate_1_${order.invoiceNumber}`)
      .setLabel("⭐ 1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate_2_${order.invoiceNumber}`)
      .setLabel("⭐⭐ 2")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate_3_${order.invoiceNumber}`)
      .setLabel("⭐⭐⭐ 3")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate_4_${order.invoiceNumber}`)
      .setLabel("⭐⭐⭐⭐ 4")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate_5_${order.invoiceNumber}`)
      .setLabel("⭐⭐⭐⭐⭐ 5")
      .setStyle(ButtonStyle.Primary)
  );

  await user.send({
    content: "⭐ **يرجى تقييم تجربتك:**",
    components: [row]
  });
}

// ======================= EXPRESS DASHBOARD API =======================
const crypto = require("crypto");
const app = express();
app.use(express.json());

const adminSessions = {};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

// ====== Admin Login ======
app.post("/api/admin/login", (req, res) => {
  const pw = (req.body && req.body.password) || "";

  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }

  const token = createToken();
  adminSessions[token] = { createdAt: Date.now() };

  return res.json({ token });
});

function adminAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || !adminSessions[token]) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}

// ====== Stats ======
app.get("/api/stats", (req, res) => {
  const data = loadData();
  const totalProducts = Object.keys(data.products).length;

  let totalKeys = 0;
  Object.values(data.products).forEach((p) => {
    Object.values(p.plans || {}).forEach((pl) => {
      totalKeys += (pl.keys || []).filter((k) => !k.used).length;
    });
  });

  res.json({
    totalProducts,
    totalKeys,
    totalOrders: Object.keys(data.orders).length,
    totalReviews: data.reviews.length
  });
});

// ====== Get Products ======
app.get("/api/products", (req, res) => {
  const data = loadData();
  const arr = Object.values(data.products).map((p) => {
    let totalStock = 0;

    Object.values(p.plans).forEach((pl) => {
      totalStock += pl.keys.filter((k) => !k.used).length;
    });

    return {
      id: p.id,
      name: p.name,
      plans: Object.values(p.plans),
      stock: totalStock
    };
  });

  res.json(arr);
});

// ====== Add Product ======
app.post("/api/products", adminAuth, (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: "missing fields" });
  }

  const data = loadData();
  if (!data.products[id]) {
    data.products[id] = { id, name, plans: {} };
  }

  saveData(data);
  res.json({ ok: true });
});

// ====== Add Plan to Product ======
app.post("/api/products/:id/plan", adminAuth, (req, res) => {
  const productId = req.params.id;
  const { planId, label, price } = req.body;

  if (!planId || !label || !price) {
    return res.status(400).json({ error: "missing fields" });
  }

  const data = loadData();
  const prod = data.products[productId];

  if (!prod) return res.status(404).json({ error: "product_not_found" });

  prod.plans[planId] = {
    id: planId,
    label,
    price,
    keys: []
  };

  saveData(data);
  res.json({ ok: true });
});

// ====== Add Keys To Specific Plan ======
app.post("/api/products/:id/plan/:planId/keys", adminAuth, (req, res) => {
  const productId = req.params.id;
  const planId = req.params.planId;
  const { keys } = req.body;

  if (!keys || !Array.isArray(keys)) {
    return res.status(400).json({ error: "keys_required" });
  }

  const data = loadData();
  const prod = data.products[productId];
  if (!prod) return res.status(404).json({ error: "product_not_found" });

  const plan = prod.plans[planId];
  if (!plan) return res.status(404).json({ error: "plan_not_found" });

  keys.forEach((k) => {
    plan.keys.push({ value: k, used: false });
  });

  saveData(data);
  res.json({ ok: true, added: keys.length });
});

// ====== Orders ======
app.get("/api/orders/recent", adminAuth, (req, res) => {
  const data = loadData();

  const orders = Object.values(data.orders)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200)
    .map((o) => {
      const prod = data.products[o.productId];
      const plan = prod ? prod.plans[o.planId] : null;

      return {
        ...o,
        productName: prod ? prod.name : o.productId,
        planLabel: plan ? plan.label : "Unknown"
      };
    });

  res.json(orders);
});

// ====== Accept Order ======
app.post("/api/orders/:invoice/accept", adminAuth, async (req, res) => {
  const invoice = req.params.invoice;
  const data = loadData();

  const order = data.orders[invoice];
  if (!order) return res.status(404).json({ error: "order_not_found" });

  const prod = data.products[order.productId];
  const plan = prod.plans[order.planId];

  const key = plan.keys.find((k) => !k.used);
  if (!key) return res.status(400).json({ error: "no stock" });

  key.used = true;
  order.status = "completed";
  order.keyDelivered = key.value;

  saveData(data);

  try {
    const user = await client.users.fetch(order.userId);
    user.send(`✅ تم قبول طلبك:\n\`\`\`${key.value}\`\`\``);
    sendReviewRequest(user, order, plan, prod);
  } catch {}

  res.json({ ok: true });
});

// ====== Reject Order ======
app.post("/api/orders/:invoice/reject", adminAuth, async (req, res) => {
  const invoice = req.params.invoice;
  const data = loadData();

  const order = data.orders[invoice];
  if (!order) return res.status(404).json({ error: "order_not_found" });

  order.status = "rejected";
  saveData(data);

  try {
    const user = await client.users.fetch(order.userId);
    user.send("❌ تم رفض طلبك.");
  } catch {}

  res.json({ ok: true });
});

// ====== Reviews ======
app.get("/api/reviews", adminAuth, (req, res) => {
  const data = loadData();
  res.json(data.reviews.sort((a, b) => b.timestamp - a.timestamp));
});

// ====== Health ======
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ====== تشغيل السيرفر ======
app.listen(PORT, () => {
  console.log(`🌍 Dashboard running on port ${PORT}`);
});

// ====== تشغيل البوت ======
client.login(process.env.DISCORD_TOKEN);
