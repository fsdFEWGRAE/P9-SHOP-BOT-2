// ================== P9 SHOP BOT + DASHBOARD ==================
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const fs = require("fs");
const express = require("express");
const crypto = require("crypto");

// ================== BASIC CONFIG ==================
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

// عدل هذه على حسب سيرفرك
const REVIEW_CHANNEL_ID = "1438169825489719326"; // روم التقييمات
const OWNER_ID = process.env.OWNER_ID;           // حطها في Secrets

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const PORT = process.env.BOT_PORT || process.env.PORT || 5050;

// بيانات الدفع (كلها من secrets)
const PAYMENT = {
  paypalEmail: process.env.PAYPAL_EMAIL || "your-paypal@example.com",
  stcNumber: process.env.STC_PAY_NUMBER || "05xxxxxxxx",
  barqId: process.env.BARQ_ID || "BARQ-ID",
  bankIban: process.env.BANK_IBAN || "SAxxxxxxxxxxxxxxxxxxxx",
  giftCardNote:
    process.env.GIFTCARD_NOTE || "Send your gift card code here in DMs."
};

// ================== TRANSLATIONS ==================
const translations = {
  en: {
    // general / system
    languageChanged: "Language changed to English!",
    languageChooseTitle: "Choose your language",
    languageChooseDesc: "Pick your preferred language for the shop.",
    languageArabic: "Arabic",
    languageEnglish: "English",

    // shop message
    shopTitle: "P9 Shop",
    shopDescription:
      "Click the button below to open the shop, pick a product, select duration, and choose your payment method.",
    shopButton: "Open Shop",

    // DM / invoice / payment
    selectProduct: "Select a product to buy:",
    selectPlan: "Select a duration / plan:",
    selectPayment: "Select your payment method:",
    noProducts: "No products available!",
    noPlans: "This product has no plans available!",
    noStock: "This product or plan is out of stock!",

    invoiceTitle: "Payment Invoice",
    invoiceNumber: "Invoice Number",
    product: "Product",
    plan: "Plan",
    price: "Price",
    paymentMethod: "Payment Method",
    paymentDetails: "Payment Details",
    sendProof:
      "Please send your payment proof here in DM as an image or message after you pay.",
    proofReceived: "Payment proof received! Waiting for owner approval...",
    orderPending: "New Order Pending Approval",
    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order has been rejected.",
    approveOrder: "Approve Order",
    rejectOrder: "Reject Order",

    // discounts
    discountAdded: "Discount code created successfully!",
    discountApplied:
      "Discount code applied! You will get {percent}% off your next purchase.",
    discountInvalid: "Invalid or expired discount code!",
    discountUsed: "You already have a discount applied!",

    // reviews
    rateExperience: "Please rate your experience:",
    reviewReceived: "Thank you for your review!",
    customer: "Customer",
    comment: "Comment",

    // stock cmd
    stockHeader: "Stock status:",
    noStockProducts: "No products currently."
  },
  ar: {
    // general / system
    languageChanged: "تم تغيير اللغة إلى العربية!",
    languageChooseTitle: "اختر لغتك",
    languageChooseDesc: "اختر اللغة المفضلة للمتجر والرسائل.",
    languageArabic: "العربية",
    languageEnglish: "الإنجليزية",

    // shop message
    shopTitle: "متجر P9",
    shopDescription:
      "اضغط على الزر لفتح المتجر، ثم اختر المنتج، بعدها المدة، ثم طريقة الدفع.",
    shopButton: "فتح المتجر",

    // DM / invoice / payment
    selectProduct: "اختر منتج للشراء:",
    selectPlan: "اختر المدة / الخطة:",
    selectPayment: "اختر طريقة الدفع:",
    noProducts: "لا توجد منتجات متاحة!",
    noPlans: "لا توجد فترات متاحة لهذا المنتج!",
    noStock: "هذا المنتج أو هذه المدة غير متوفرة حالياً!",

    invoiceTitle: "فاتورة الدفع",
    invoiceNumber: "رقم الفاتورة",
    product: "المنتج",
    plan: "المدة",
    price: "السعر",
    paymentMethod: "طريقة الدفع",
    paymentDetails: "بيانات الدفع",
    sendProof:
      "بعد التحويل أرسل إثبات الدفع هنا في الخاص كصورة أو رسالة.",
    proofReceived: "تم استلام إثبات الدفع! في انتظار موافقة المالك...",
    orderPending: "طلب جديد في انتظار الموافقة",
    orderApproved: "تمت الموافقة على طلبك! إليك المفتاح:",
    orderRejected: "تم رفض طلبك.",
    approveOrder: "قبول الطلب",
    rejectOrder: "رفض الطلب",

    // discounts
    discountAdded: "تم إنشاء كود الخصم بنجاح!",
    discountApplied:
      "تم تطبيق كود الخصم! ستحصل على خصم {percent}% على الشراء القادم.",
    discountInvalid: "كود خصم غير صالح أو منتهي!",
    discountUsed: "لديك بالفعل كود خصم مطبق!",

    // reviews
    rateExperience: "يرجى تقييم تجربتك:",
    reviewReceived: "شكراً لتقييمك!",
    customer: "العميل",
    comment: "التعليق",

    // stock cmd
    stockHeader: "حالة المخزون:",
    noStockProducts: "لا توجد منتجات حالياً."
  }
};

// ================== DATA HELPERS (data.json) ==================
function loadData() {
  try {
    const raw = fs.readFileSync("data.json", "utf8");
    const data = JSON.parse(raw);

    data.products = data.products || {};
    data.orders = data.orders || {};
    data.invoiceCounter = data.invoiceCounter || 1000;
    data.userLanguages = data.userLanguages || {};
    data.discounts = data.discounts || {};
    data.discountRedemptions = data.discountRedemptions || {};
    data.reviews = data.reviews || [];

    // ترقية قديمة (لو فيه منتجات بدون plans)
    for (const [id, p] of Object.entries(data.products)) {
      if (!p.plans) {
        p.plans = {};
        // لو كان فيه price و keys قديمين نخليهم Plan واحد
        const legacyKeys = p.keys || [];
        const legacyPrice = p.price || 0;
        if (legacyPrice || legacyKeys.length) {
          p.plans["default"] = {
            id: "default",
            label: "Standard",
            price: legacyPrice,
            keys: legacyKeys
          };
        }
        delete p.keys;
        delete p.price;
      }
      // تأكد من keys array
      for (const planId of Object.keys(p.plans)) {
        p.plans[planId].keys = p.plans[planId].keys || [];
      }
    }

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
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

function getLang(userId) {
  const data = loadData();
  return data.userLanguages[userId] || "ar"; // نخلي الافتراضي عربي
}

function t(userId, key, vars = {}) {
  const lang = getLang(userId);
  let text =
    (translations[lang] && translations[lang][key]) ||
    (translations.en && translations.en[key]) ||
    key;
  Object.keys(vars).forEach((k) => {
    text = text.replace(`{${k}}`, vars[k]);
  });
  return text;
}

// helpers للمنتجات / الفترات
function getProductTotalStock(product) {
  if (!product || !product.plans) return 0;
  let total = 0;
  for (const plan of Object.values(product.plans)) {
    total += (plan.keys || []).filter((k) => !k.used).length;
  }
  return total;
}

function getPlanStock(product, planId) {
  if (!product || !product.plans || !product.plans[planId]) return 0;
  return (product.plans[planId].keys || []).filter((k) => !k.used).length;
}

// ================== DISCORD READY ==================
client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(
    `📦 Serving ${Object.keys(loadData().products).length} products (with plans)`
  );
});

// ================== MESSAGE HANDLER ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // لو مو أمر
  if (!message.content.startsWith(PREFIX)) {
    // ولو كان في الخاص نعتبره إثبات دفع (الدالة في Part 2)
    if (message.channel.type === 1 /* DM */) {
      handleDMProof(message);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // ================= help =================
  if (command === "help") {
    return message.reply(
      [
        "📜 **الأوامر المتاحة / Available Commands:**",
        "",
        "-help",
        "-addproduct id | name",
        "-addplan productId | planId | label | price",
        "-addkeys productId | planId | key1,key2,key3",
        "-stock",
        "-discount CODE",
        "-adddiscount CODE | PERCENT | MAX_USES(optional)",
        "-lang en / ar",
        "-sendlangbutton   (المالك فقط)",
        "-sendshopbutton   (المالك فقط)"
      ].join("\n")
    );
  }

  // ================= lang =================
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

  // ================= addproduct =================
  if (command === "addproduct") {
    if (message.author.id !== OWNER_ID) return;

    const input = args.join(" ");
    const parts = input.split("|").map((p) => p.trim());
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
      data.products[id].plans = data.products[id].plans || {};
    }

    saveData(data);
    return message.reply(`✅ Product **${name}** (${id}) saved.`);
  }

  // ================= addplan =================
  if (command === "addplan") {
    if (message.author.id !== OWNER_ID) return;

    const input = args.join(" ");
    const parts = input.split("|").map((p) => p.trim());
    // productId | planId | label | price
    if (parts.length < 4) {
      return message.reply(
        "Usage: -addplan productId | planId | label | price"
      );
    }

    const [productId, planId, label, priceStr] = parts;
    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      return message.reply("❌ Invalid price.");
    }

    const data = loadData();
    const product = data.products[productId];
    if (!product) {
      return message.reply("❌ Product not found.");
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
      `✅ Plan **${label}** (${planId}) added to product **${product.name}** with price **${price}**.`
    );
  }

  // ================= addkeys =================
  if (command === "addkeys") {
    if (message.author.id !== OWNER_ID) return;

    const input = args.join(" ");
    // productId | planId | k1,k2,k3
    const parts = input.split("|").map((p) => p.trim());
    if (parts.length < 3) {
      return message.reply(
        "Usage: -addkeys productId | planId | key1,key2,key3"
      );
    }

    const [productId, planId, keysStr] = parts;
    const keysArr = keysStr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (!keysArr.length) {
      return message.reply("❌ No keys provided.");
    }

    const data = loadData();
    const product = data.products[productId];
    if (!product) return message.reply("❌ Product not found.");
    const plan = (product.plans || {})[planId];
    if (!plan) return message.reply("❌ Plan not found for this product.");

    plan.keys = plan.keys || [];
    keysArr.forEach((val) => {
      plan.keys.push({ value: val, used: false });
    });

    saveData(data);
    return message.reply(
      `✅ Added **${keysArr.length}** keys to product **${product.name}** plan **${plan.label}**.`
    );
  }

  // ================= stock =================
  if (command === "stock") {
    const data = loadData();
    const products = Object.values(data.products);

    if (!products.length) {
      return message.reply(t(message.author.id, "noStockProducts"));
    }

    let msg = `📦 **${t(
      message.author.id,
      "stockHeader"
    )}**\n\n`;

    for (const p of products) {
      const totalStock = getProductTotalStock(p);
      let color = "🟩";
      if (totalStock < 5) color = "🟧";
      if (totalStock === 0) color = "🟥";

      msg += `${color} **${p.name}** — (${p.id})\n`;

      // عرض مخزون كل Plan تحت المنتج
      for (const plan of Object.values(p.plans || {})) {
        const s = getPlanStock(p, plan.id);
        msg += `   ⏱️ ${plan.label}: **${s}** keys\n`;
      }
      msg += `\n`;
    }

    return message.reply(msg);
  }

  // ================= discount =================
  if (command === "discount") {
    const code = args[0]?.toUpperCase();
    if (!code) return;

    const data = loadData();
    const discount = data.discounts[code];

    if (!discount) {
      return message.reply(t(message.author.id, "discountInvalid"));
    }
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return message.reply(t(message.author.id, "discountInvalid"));
    }
    if (data.discountRedemptions[message.author.id]) {
      return message.reply(t(message.author.id, "discountUsed"));
    }

    data.discountRedemptions[message.author.id] = code;
    saveData(data);

    return message.reply(
      t(message.author.id, "discountApplied", { percent: discount.percent })
    );
  }

  // ================= adddiscount =================
  if (command === "adddiscount") {
    if (message.author.id !== OWNER_ID) return;

    const input = args.join(" ");
    const parts = input.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      return message.reply(
        "Usage: -adddiscount CODE | PERCENT | MAX_USES(optional)"
      );
    }

    const [code, percentStr, maxUsesStr] = parts;
    const percent = parseFloat(percentStr);
    if (isNaN(percent)) return message.reply("❌ Invalid percent.");

    const maxUses = maxUsesStr ? parseInt(maxUsesStr) : null;

    const data = loadData();
    data.discounts[code.toUpperCase()] = {
      percent,
      maxUses: isNaN(maxUses) ? null : maxUses,
      usedCount: 0
    };
    saveData(data);

    return message.reply(t(message.author.id, "discountAdded"));
  }

  // ================= sendlangbutton =================
  if (command === "sendlangbutton") {
    if (message.author.id !== OWNER_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("🌐 / لغة المتجر - Shop Language")
      .setDescription(
        "اختر لغتك المفضلة للمتجر.\nChoose your preferred language for the shop."
      )
      .setColor(0x00a3ff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("setlang_ar")
        .setLabel("العربية")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("setlang_en")
        .setLabel("English")
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply("✅ تم إرسال رسالة اختيار اللغة.");
  }

  // ================= sendshopbutton =================
  if (command === "sendshopbutton") {
    if (message.author.id !== OWNER_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("🛒 P9 Shop")
      .setDescription(
        "اضغط الزر لفتح المتجر.\nClick the button below to open the shop."
      )
      .setColor(0x00e5a4);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_shop")
        .setLabel("🛒 Open Shop / فتح المتجر")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply("✅ تم إرسال رسالة المتجر.");
  }
});

// ================== END OF PART 1 ==================
// ================== INTERACTIONS HANDLER ==================
client.on("interactionCreate", async (interaction) => {
  // ================== SET LANGUAGE ==================
  if (interaction.isButton()) {
    if (interaction.customId === "setlang_ar") {
      const data = loadData();
      data.userLanguages[interaction.user.id] = "ar";
      saveData(data);

      return interaction.reply({
        content: t(interaction.user.id, "languageChanged"),
        ephemeral: true
      });
    }

    if (interaction.customId === "setlang_en") {
      const data = loadData();
      data.userLanguages[interaction.user.id] = "en";
      saveData(data);

      return interaction.reply({
        content: t(interaction.user.id, "languageChanged"),
        ephemeral: true
      });
    }
  }

  // ================== OPEN SHOP BUTTON ==================
  if (interaction.isButton() && interaction.customId === "open_shop") {
    const data = loadData();
    const products = Object.values(data.products);

    if (!products.length) {
      return interaction.reply({
        content: t(interaction.user.id, "noProducts"),
        ephemeral: true
      });
    }

    const options = products.map((p) => ({
      label: `${p.name} (${getProductTotalStock(p)} keys)`,
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

  // ================== SELECT PRODUCT ==================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_product") {
    const productId = interaction.values[0];
    const data = loadData();
    const product = data.products[productId];

    if (!product) {
      return interaction.reply({
        content: t(interaction.user.id, "productNotFound"),
        ephemeral: true
      });
    }

    const plans = Object.values(product.plans || {});
    if (!plans.length) {
      return interaction.reply({
        content: t(interaction.user.id, "noPlans"),
        ephemeral: true
      });
    }

    const options = plans.map((pl) => ({
      label: `${pl.label} — ${pl.price}`,
      description: `${getPlanStock(product, pl.id)} keys`,
      value: `${productId}:${pl.id}`
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

  // ================== SELECT PLAN ==================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_plan") {
    const [productId, planId] = interaction.values[0].split(":");
    const data = loadData();
    const product = data.products[productId];
    const plan = product?.plans?.[planId];

    if (!product || !plan) {
      return interaction.reply({
        content: t(interaction.user.id, "noPlans"),
        ephemeral: true
      });
    }

    if (getPlanStock(product, planId) === 0) {
      return interaction.reply({
        content: t(interaction.user.id, "noStock"),
        ephemeral: true
      });
    }

    const methods = [
      { label: "PayPal", value: "paypal" },
      { label: "STC Pay", value: "stc" },
      { label: "Barq", value: "barq" },
      { label: "Bank Transfer", value: "bank" },
      { label: "Gift Card", value: "gift" }
    ];

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_payment:${productId}:${planId}`)
        .setPlaceholder(t(interaction.user.id, "selectPayment"))
        .addOptions(methods)
    );

    return interaction.reply({
      content: t(interaction.user.id, "selectPayment"),
      components: [row],
      ephemeral: true
    });
  }

  // ================== SELECT PAYMENT ==================
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_payment")) {
    const [_, productId, planId] = interaction.customId.split(":");
    const paymentMethod = interaction.values[0];

    const data = loadData();
    const product = data.products[productId];
    const plan = product.plans[planId];

    let price = plan.price;

    // تطبيق الخصم إن وجد
    const dc = data.discountRedemptions[interaction.user.id];
    if (dc && data.discounts[dc]) {
      let percent = data.discounts[dc].percent;
      price = price - (price * percent / 100);
    }

    const invoice = data.invoiceCounter++;
    data.orders[invoice] = {
      invoiceNumber: invoice,
      userId: interaction.user.id,
      productId,
      planId,
      paymentMethod,
      finalPrice: price,
      discount: dc || null,
      status: "pending",
      timestamp: Date.now()
    };

    // خصم استخدم → يتم إزالته
    if (dc) {
      data.discounts[dc].usedCount++;
      delete data.discountRedemptions[interaction.user.id];
    }

    saveData(data);

    // إرسال الفاتورة للعميل في الخاص
    const pmDetails = {
      paypal: PAYMENT.paypalEmail,
      stc: PAYMENT.stcNumber,
      barq: PAYMENT.barqId,
      bank: PAYMENT.bankIban,
      gift: PAYMENT.giftCardNote
    };

    const embed = new EmbedBuilder()
      .setTitle(t(interaction.user.id, "invoiceTitle"))
      .setColor(0x00ff9d)
      .addFields(
        { name: t(interaction.user.id, "invoiceNumber"), value: `#${invoice}`, inline: true },
        { name: t(interaction.user.id, "product"), value: product.name, inline: true },
        { name: t(interaction.user.id, "plan"), value: plan.label, inline: true },
        { name: t(interaction.user.id, "price"), value: `${price}`, inline: true },
        { name: t(interaction.user.id, "paymentMethod"), value: paymentMethod.toUpperCase(), inline: true },
        {
          name: t(interaction.user.id, "paymentDetails"),
          value: `\`\`\`${pmDetails[paymentMethod]}\`\`\``
        }
      )
      .setFooter({ text: t(interaction.user.id, "sendProof") })
      .setTimestamp();

    await interaction.user.send({ embeds: [embed] });

    return interaction.reply({
      content: "📩 **تم إرسال الفاتورة في الخاص!**",
      ephemeral: true
    });
  }

  // ================== REVIEW BUTTONS ==================
  if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
    const [_, rating, invoice] = interaction.customId.split("_");

    const modal = new ModalBuilder()
      .setCustomId(`review_${rating}_${invoice}`)
      .setTitle(`${rating} ⭐ Review`);

    const comment = new TextInputBuilder()
      .setCustomId("comment")
      .setLabel(t(interaction.user.id, "comment"))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const row = new ActionRowBuilder().addComponents(comment);
    modal.addComponents(row);

    return interaction.showModal(modal);
  }

  // ================== REVIEW SUBMIT ==================
  if (interaction.isModalSubmit() && interaction.customId.startsWith("review_")) {
    const [_, rating, invoice] = interaction.customId.split("_");
    const comment = interaction.fields.getTextInputValue("comment") || "—";

    const data = loadData();
    const order = data.orders[invoice];
    const product = data.products[order.productId];
    const plan = product.plans[order.planId];

    data.reviews.push({
      userId: interaction.user.id,
      productId: order.productId,
      planId: order.planId,
      planLabel: plan.label,
      rating: parseInt(rating),
      comment,
      timestamp: Date.now()
    });

    saveData(data);

    await interaction.reply({
      content: t(interaction.user.id, "reviewReceived"),
      ephemeral: true
    });

    const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
    const stars = "⭐".repeat(parseInt(rating));

    const emb = new EmbedBuilder()
      .setTitle(`${stars} (${rating}/5)`)
      .setColor(0xffd700)
      .addFields(
        { name: t(interaction.user.id, "customer"), value: `<@${interaction.user.id}>`, inline: true },
        { name: t(interaction.user.id, "product"), value: `${product.name} — ${plan.label}`, inline: true },
        { name: t(interaction.user.id, "comment"), value: comment }
      )
      .setTimestamp();

    return channel.send({ embeds: [emb] });
  }
});
// ================== HANDLE DM PAYMENT PROOF ==================
async function handleDMProof(message) {
  const data = loadData();

  // آخر طلب pending للمستخدم
  const order = Object.values(data.orders)
    .filter(o => o.userId === message.author.id && o.status === "pending")
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!order) return;

  const owner = await client.users.fetch(process.env.OWNER_ID);
  const product = data.products[order.productId];
  const plan = product.plans[order.planId];

  const embed = new EmbedBuilder()
    .setTitle(t(owner.id, "orderPending"))
    .setColor(0xff9900)
    .addFields(
      { name: "Invoice", value: `#${order.invoiceNumber}`, inline: true },
      { name: "Customer", value: `<@${order.userId}>`, inline: true },
      { name: "Product", value: product.name, inline: true },
      { name: "Plan", value: plan.label, inline: true },
      { name: "Price", value: `${order.finalPrice}`, inline: true },
      { name: "Payment", value: order.paymentMethod.toUpperCase(), inline: true }
    )
    .setDescription(`**Payment Proof:**\n${message.content || "[Image]"}`)
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${order.invoiceNumber}`)
      .setLabel(t(owner.id, "approveOrder"))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${order.invoiceNumber}`)
      .setLabel(t(owner.id, "rejectOrder"))
      .setStyle(ButtonStyle.Danger)
  );

  await owner.send({ embeds: [embed], components: [row] });
  await message.reply(t(message.author.id, "proofReceived"));
}

// ================== REVIEW REQUEST AFTER COMPLETE ==================
async function sendReviewRequest(user, order, product) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rate_1_${order.invoiceNumber}`).setLabel("⭐ 1").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_2_${order.invoiceNumber}`).setLabel("⭐⭐ 2").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_3_${order.invoiceNumber}`).setLabel("⭐⭐⭐ 3").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_4_${order.invoiceNumber}`).setLabel("⭐⭐⭐⭐ 4").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_5_${order.invoiceNumber}`).setLabel("⭐⭐⭐⭐⭐ 5").setStyle(ButtonStyle.Primary)
  );

  await user.send({
    content: t(user.id, "rateExperience"),
    components: [row]
  });
}

// ================== EXPRESS DASHBOARD SERVER ==================
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// جلسات الدخول
const adminSessions = {};

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

// -------- LOGIN --------
app.post("/api/admin/login", (req, res) => {
  const pw = req.body.password;
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }

  const token = createToken();
  adminSessions[token] = { created: Date.now() };

  return res.json({ token });
});

// ميدل وير تحقق
function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || !adminSessions[token]) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// -------- HEALTH --------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// -------- PRODUCTS API --------
app.get("/api/products", (req, res) => {
  const data = loadData();
  const list = Object.values(data.products).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    plans: p.plans || {},
    stock: getProductTotalStock(p)
  }));
  res.json(list);
});

app.post("/api/products", adminAuth, (req, res) => {
  const { id, name, price } = req.body;
  if (!id || !name || typeof price !== "number") {
    return res.status(400).json({ error: "missing_fields" });
  }

  const data = loadData();
  data.products[id] = data.products[id] || { id, keys: {}, plans: {} };
  data.products[id].name = name;
  data.products[id].price = price;

  saveData(data);
  res.json({ ok: true });
});

// إضافة بلان للمنتج
app.post("/api/products/:id/plans", adminAuth, (req, res) => {
  const { planId, label, price } = req.body;
  const pid = req.params.id;

  const data = loadData();
  const p = data.products[pid];

  if (!p) return res.status(404).json({ error: "product_not_found" });
  if (!planId || !label || typeof price !== "number") {
    return res.status(400).json({ error: "missing_fields" });
  }

  p.plans = p.plans || {};
  p.plans[planId] = { id: planId, label, price };

  saveData(data);
  res.json({ ok: true });
});

// إضافة مفاتيح لفترة
app.post("/api/products/:id/keys", adminAuth, (req, res) => {
  const pid = req.params.id;
  const { planId, keys } = req.body;

  if (!planId || !Array.isArray(keys)) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const data = loadData();
  const p = data.products[pid];
  if (!p) return res.status(404).json({ error: "product_not_found" });

  p.keys = p.keys || {};
  p.keys[planId] = p.keys[planId] || [];

  keys.forEach((k) => p.keys[planId].push({ value: k, used: false }));

  saveData(data);
  res.json({ ok: true });
});

// -------- ORDERS API --------
app.get("/api/orders/recent", adminAuth, (req, res) => {
  const data = loadData();
  const orders = Object.values(data.orders)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(200);

  orders.forEach((o) => {
    const p = data.products[o.productId];
    const pl = p?.plans[o.planId];
    o.productName = p?.name;
    o.planLabel = pl?.label;
  });

  res.json(orders);
});

// قبول الطلب
app.post("/api/orders/:id/accept", adminAuth, async (req, res) => {
  const inv = req.params.id;
  const data = loadData();
  const order = data.orders[inv];

  if (!order) return res.status(404).json({ error: "not_found" });

  const product = data.products[order.productId];
  const plan = product.plans[order.planId];

  const keyObj = product.keys[order.planId].find((k) => !k.used);
  if (!keyObj) return res.status(400).json({ error: "no_stock" });

  keyObj.used = true;
  order.status = "completed";
  order.keyDelivered = keyObj.value;

  saveData(data);

  try {
    const user = await client.users.fetch(order.userId);
    await user.send(
      t(order.userId, "orderApproved") + `\n\`\`\`${keyObj.value}\`\`\``
    );
    await sendReviewRequest(user, order, product);
  } catch (err) {
    console.error("DM Failed:", err);
  }

  res.json({ ok: true });
});

// رفض الطلب
app.post("/api/orders/:id/reject", adminAuth, async (req, res) => {
  const inv = req.params.id;
  const data = loadData();
  const order = data.orders[inv];

  if (!order) return res.status(404).json({ error: "not_found" });

  order.status = "rejected";
  saveData(data);

  try {
    const user = await client.users.fetch(order.userId);
    await user.send(t(order.userId, "orderRejected"));
  } catch {}

  res.json({ ok: true });
});

// -------- REVIEWS API --------
app.get("/api/reviews", adminAuth, (req, res) => {
  const data = loadData();
  const arr = data.reviews.sort((a, b) => b.timestamp - a.timestamp);
  res.json(arr);
});

// -------- START SERVER --------
app.get("/", (req, res) => {
  res.send("P9 Shop Dashboard Running ✔");
});

app.listen(process.env.PORT || 5050, () => {
  console.log("🌐 Dashboard Running...");
});

// -------- START DISCORD BOT --------
client.login(process.env.DISCORD_TOKEN);
