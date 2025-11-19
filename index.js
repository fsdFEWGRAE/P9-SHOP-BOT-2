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

// =========== Translations ===========
const translations = {
  en: {
    notOwner: "You are not the owner.",
    productAdded: "Product added successfully!",
    planAdded: "Plan added successfully!",
    keyAdded: "Key added successfully!",
    productNotFound: "Product not found!",
    planNotFound: "Plan not found!",
    selectProduct: "Select a product:",
    selectPlan: "Select subscription period:",
    selectPayment: "Select payment method:",
    noProducts: "No products available!",
    noPlans: "This product has no plans!",
    noKeys: "No keys available for this plan!",
    invoiceTitle: "Payment Invoice",
    invoiceNote: "Please send payment proof (screenshot or transaction ID) in DM.",
    invoiceSent: "Invoice sent to your DM.",
    proofReceived: "Payment proof received. Waiting for approval.",
    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order has been rejected.",
    reviewAsk: "Please rate your experience:",
    reviewReceived: "Thanks for your review!",
    languageChangedAr: "Language changed to Arabic 🇸🇦",
    languageChangedEn: "Language changed to English 🇬🇧",
    bankTransfer: "Bank Transfer",
    stcBarq: "STC Pay / Barq",
    paypal: "PayPal",
    giftcard: "Gift Card",
    paymentInfoBank:
      "Bank transfer IBAN:\n`SA1980204507849222121014`\n\nAfter transfer, send proof here.",
    paymentInfoStcBarq:
      "For STC Pay / Barq please open a ticket in the server to get the transfer number.",
    paymentInfoPaypal:
      "PayPal email:\n`17sutef2@gmail.com`\n\nSend payment then send proof here.",
    paymentInfoGiftcard:
      "Gift Card must be from this website only:\nhttps://skine.com/en-us/rewarble\nSend the code here after purchase.",
    stockHeader: "Inventory status:",
    stockNone: "No products currently."
  },
  ar: {
    notOwner: "❌ أنت لست المالك.",
    productAdded: "✅ تم إضافة المنتج بنجاح!",
    planAdded: "✅ تم إضافة المدة بنجاح!",
    keyAdded: "🔑 تم إضافة المفتاح بنجاح!",
    productNotFound: "❌ المنتج غير موجود!",
    planNotFound: "❌ المدة غير موجودة!",
    selectProduct: "اختر منتج:",
    selectPlan: "اختر المدة:",
    selectPayment: "اختر وسيلة الدفع:",
    noProducts: "❌ لا توجد منتجات متاحة!",
    noPlans: "❌ هذا المنتج لا يحتوي على مدد!",
    noKeys: "❌ لا توجد مفاتيح متاحة لهذه المدة!",
    invoiceTitle: "فاتورة الدفع",
    invoiceNote: "يرجى إرسال إثبات الدفع (صورة أو رقم العملية) في الخاص.",
    invoiceSent: "📨 تم إرسال الفاتورة إلى الخاص.",
    proofReceived: "⌛ تم استلام الإثبات… في انتظار الموافقة.",
    orderApproved: "✅ تمت الموافقة على طلبك! هذا مفتاحك:",
    orderRejected: "❌ تم رفض طلبك.",
    reviewAsk: "يرجى تقييم تجربتك:",
    reviewReceived: "شكراً على تقييمك!",
    languageChangedAr: "تم تغيير اللغة إلى العربية 🇸🇦",
    languageChangedEn: "Language changed to English 🇬🇧",
    bankTransfer: "تحويل بنكي",
    stcBarq: "STC Pay / Barq",
    paypal: "باي بال",
    giftcard: "Gift Card",
    paymentInfoBank:
      "معلومات التحويل البنكي:\n`SA1980204507849222121014`\n\nبعد التحويل أرسل إثبات الدفع هنا.",
    paymentInfoStcBarq:
      "لـ STC Pay و Barq قم بفتح تذكرة في السيرفر للحصول على رقم التحويل.",
    paymentInfoPaypal:
      "إيميل PayPal:\n`17sutef2@gmail.com`\n\nقم بالدفع ثم أرسل الإثبات هنا.",
    paymentInfoGiftcard:
      "بطاقة الهدايا يجب أن تكون من هذا الموقع فقط:\nhttps://skine.com/en-us/rewarble\nأرسل الكود هنا بعد الشراء.",
    stockHeader: "📦 حالة المخزون:",
    stockNone: "❌ لا توجد منتجات حالياً."
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
    data.invoiceCounter = data.invoiceCounter || 1000;
    return data;
  } catch (e) {
    return {
      products: {}, // { id, name, plans:[{id,name,price,keys:[{value,used}]}] }
      orders: {}, // invoice -> { invoice, userId, productId, planId, payment, status, timestamp, key? }
      reviews: [],
      userLanguages: {},
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

function getPaymentInfo(method, userId) {
  const lang = getLang(userId);
  const tr = translations[lang];

  switch (method) {
    case "bank":
      return tr.paymentInfoBank;
    case "stc":
    case "barq":
      return tr.paymentInfoStcBarq;
    case "paypal":
      return tr.paymentInfoPaypal;
    case "giftcard":
      return tr.paymentInfoGiftcard;
    default:
      return "";
  }
}

// =========== Discord Ready ===========
client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

// =============================================
// ============ MESSAGE COMMANDS ===============
// =============================================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // DM payment proof (non-command in DM)
  if (!message.content.startsWith(PREFIX)) {
    if (message.channel.type === 1) {
      return handleDMProof(message);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // ---------- Language Message ----------
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
      content: "اختر لغتك / Choose your language:",
      components: [row]
    });
  }

  // ---------- Send Shop Button ----------
  if (command === "sendshop") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_shop")
        .setLabel("🛒 شراء / Buy")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({
      content: "اضغط لفتح قائمة المتجر / Click to open shop:",
      components: [row]
    });
  }

  // ---------- Stock ----------
  if (command === "stock") {
    const data = loadData();
    const products = Object.values(data.products);

    if (!products.length) {
      return message.reply(translations[getLang(message.author.id)].stockNone);
    }

    let msg = translations[getLang(message.author.id)].stockHeader + "\n\n";

    products.forEach((prod) => {
      msg += `**${prod.name}** (${prod.id})\n`;
      if (!prod.plans || !prod.plans.length) {
        msg += "  └ لا توجد مدد.\n\n";
        return;
      }
      prod.plans.forEach((pl) => {
        const stock = (pl.keys || []).filter((k) => !k.used).length;
        let color = "🟩";
        if (stock === 0) color = "🟥";
        else if (stock < 5) color = "🟧";
        msg += `  └ ${color} ${pl.name} — Keys: **${stock}**\n`;
      });
      msg += "\n";
    });

    return message.reply(msg);
  }

  // ---------- Owner Only Below ----------
  if (
    ["addproduct", "addplan", "addkey"].includes(command) &&
    message.author.id !== OWNER_ID
  ) {
    return message.reply(t(message.author.id, "notOwner"));
  }

  // ---------- Add Product ----------
  if (command === "addproduct") {
    const parts = message.content
      .slice(PREFIX.length + "addproduct".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 2) {
      return message.reply("استخدام: -addproduct id | name");
    }

    const [id, name] = parts;
    const data = loadData();

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

  // ---------- Add Plan (time) ----------
  // مثال: -addplan prod1 | 1d | Day (1 Day) | 10
  if (command === "addplan") {
    const rest = message.content
      .slice(PREFIX.length + "addplan".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (rest.length < 4) {
      return message.reply(
        "استخدام: -addplan productId | planId | planName | price"
      );
    }

    const [productId, planId, planName, priceStr] = rest;
    const price = parseFloat(priceStr);
    if (isNaN(price)) {
      return message.reply("السعر غير صالح.");
    }

    const data = loadData();
    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    if (!product.plans) product.plans = [];
    const existing = product.plans.find((p) => p.id === planId);
    if (existing) {
      existing.name = planName;
      existing.price = price;
    } else {
      product.plans.push({
        id: planId,
        name: planName,
        price,
        keys: []
      });
    }

    saveData(data);
    return message.reply(t(message.author.id, "planAdded"));
  }

  // ---------- Add Key ----------
  // مثال: -addkey prod1 | 1d | KEY-XXXX
  if (command === "addkey") {
    const rest = message.content
      .slice(PREFIX.length + "addkey".length)
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    if (rest.length < 3) {
      return message.reply("استخدام: -addkey productId | planId | keyValue");
    }

    const [productId, planId, keyValue] = rest;
    const data = loadData();
    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    const plan = (product.plans || []).find((p) => p.id === planId);
    if (!plan) return message.reply(t(message.author.id, "planNotFound"));

    if (!plan.keys) plan.keys = [];
    plan.keys.push({ value: keyValue, used: false });
    saveData(data);

    return message.reply(t(message.author.id, "keyAdded"));
  }
});

// =============================================
// ============ INTERACTIONS ===================
// =============================================

client.on("interactionCreate", async (interaction) => {
  const data = loadData();

  // ---------- Language Buttons ----------
  if (interaction.isButton()) {
    if (interaction.customId === "lang_ar") {
      data.userLanguages[interaction.user.id] = "ar";
      saveData(data);
      return interaction.reply({
        content: translations.ar.languageChangedAr,
        ephemeral: true
      });
    }
    if (interaction.customId === "lang_en") {
      data.userLanguages[interaction.user.id] = "en";
      saveData(data);
      return interaction.reply({
        content: translations.en.languageChangedEn,
        ephemeral: true
      });
    }

    // ---------- Open Shop ----------
    if (interaction.customId === "open_shop") {
      const products = Object.values(data.products || {});
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

    // ---------- Approve / Reject ----------
    if (interaction.customId.startsWith("approve|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          content: t(interaction.user.id, "notOwner"),
          ephemeral: true
        });
      }

      const invoice = interaction.customId.split("|")[1];
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
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const plan = (product.plans || []).find((p) => p.id === order.planId);
      if (!plan) {
        return interaction.reply({
          content: t(interaction.user.id, "planNotFound"),
          ephemeral: true
        });
      }

      const keyObj = (plan.keys || []).find((k) => !k.used);
      if (!keyObj) {
        return interaction.reply({
          content: t(interaction.user.id, "noKeys"),
          ephemeral: true
        });
      }

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
        content: `✅ تم قبول الطلب #${invoice} وتم تسليم المفتاح.`,
        components: []
      });
    }

    if (interaction.customId.startsWith("reject|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          content: t(interaction.user.id, "notOwner"),
          ephemeral: true
        });
      }

      const invoice = interaction.customId.split("|")[1];
      const order = data.orders[invoice];
      if (!order) {
        return interaction.reply({
          content: "❌ الطلب غير موجود.",
          ephemeral: true
        });
      }

      order.status = "rejected";
      saveData(data);

      const user = await client.users.fetch(order.userId);
      await user.send(t(order.userId, "orderRejected"));

      return interaction.update({
        content: `❌ تم رفض الطلب #${invoice}.`,
        components: []
      });
    }

    // ---------- Rate Buttons ----------
    if (interaction.customId.startsWith("rate|")) {
      const [_, rating, invoice] = interaction.customId.split("|");

      const modal = new ModalBuilder()
        .setCustomId(`review_modal|${rating}|${invoice}`)
        .setTitle("إضافة تقييم / Add Review");

      const comment = new TextInputBuilder()
        .setCustomId("comment")
        .setLabel("اكتب تعليقاً (اختياري) / Comment (optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(comment));

      return interaction.showModal(modal);
    }
  }

  // ---------- Select Menus ----------
  if (interaction.isStringSelectMenu()) {
    // Select product
    if (interaction.customId === "select_product") {
      const productId = interaction.values[0];
      const product = data.products[productId];

      if (!product) {
        return interaction.reply({
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const plans = product.plans || [];
      if (!plans.length) {
        return interaction.reply({
          content: t(interaction.user.id, "noPlans"),
          ephemeral: true
        });
      }

      const options = plans.map((pl) => ({
        label: `${pl.name} - ${pl.price}`,
        value: `${productId}|${pl.id}`
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

    // Select plan
    if (interaction.customId === "select_plan") {
      const [productId, planId] = interaction.values[0].split("|");
      const product = data.products[productId];
      const plan = (product?.plans || []).find((p) => p.id === planId);

      if (!product || !plan) {
        return interaction.reply({
          content: t(interaction.user.id, "planNotFound"),
          ephemeral: true
        });
      }

      const paymentRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_payment|${productId}|${planId}`)
          .setPlaceholder(t(interaction.user.id, "selectPayment"))
          .addOptions([
            {
              label: translations[getLang(interaction.user.id)].bankTransfer,
              value: "bank"
            },
            {
              label: translations[getLang(interaction.user.id)].stcBarq,
              value: "stc"
            },
            {
              label: translations[getLang(interaction.user.id)].paypal,
              value: "paypal"
            },
            {
              label: translations[getLang(interaction.user.id)].giftcard,
              value: "giftcard"
            }
          ])
      );

      return interaction.reply({
        content: t(interaction.user.id, "selectPayment"),
        components: [paymentRow],
        ephemeral: true
      });
    }

    // Select payment
    if (interaction.customId.startsWith("select_payment|")) {
      const [_, productId, planId] = interaction.customId.split("|");
      const payment = interaction.values[0];

      const product = data.products[productId];
      if (!product) {
        return interaction.reply({
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const plan = (product.plans || []).find((p) => p.id === planId);
      if (!plan) {
        return interaction.reply({
          content: t(interaction.user.id, "planNotFound"),
          ephemeral: true
        });
      }

      // Check stock
      const keyAvailable = (plan.keys || []).some((k) => !k.used);
      if (!keyAvailable) {
        return interaction.reply({
          content: t(interaction.user.id, "noKeys"),
          ephemeral: true
        });
      }

      const invoice = data.invoiceCounter++;
      data.orders[invoice] = {
        invoice,
        userId: interaction.user.id,
        productId,
        planId,
        payment,
        status: "pending",
        timestamp: Date.now()
      };
      saveData(data);

      const lang = getLang(interaction.user.id);
      const tr = translations[lang];

      const paymentInfo = getPaymentInfo(payment, interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle(`${tr.invoiceTitle} #${invoice}`)
        .setColor(0x00bfff)
        .addFields(
          { name: "Product / المنتج", value: product.name, inline: true },
          { name: "Plan / المدة", value: plan.name, inline: true },
          { name: "Price / السعر", value: `${plan.price}`, inline: true },
          {
            name: tr.selectPayment,
            value:
              payment === "bank"
                ? tr.bankTransfer
                : payment === "stc"
                ? tr.stcBarq
                : payment === "paypal"
                ? tr.paypal
                : tr.giftcard
          }
        )
        .addFields({ name: "طريقة الدفع / Payment Info", value: paymentInfo })
        .setFooter({ text: tr.invoiceNote })
        .setTimestamp();

      try {
        await interaction.user.send({ embeds: [embed] });
      } catch (e) {
        console.error("Failed to DM user invoice:", e);
        return interaction.reply({
          content:
            "❌ لا يمكن إرسال الخاص. قم بفتح الخاص مع البوت / Enable DMs.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: tr.invoiceSent,
        ephemeral: true
      });
    }
  }

  // ---------- Review modal ----------
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("review_modal")) {
      const [_, rating, invoice] = interaction.customId.split("|");
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
        rating: Number(rating),
        comment,
        timestamp: Date.now()
      };

      data2.reviews.push(review);
      saveData(data2);

      await interaction.reply({
        content: t(order.userId, "reviewReceived"),
        ephemeral: true
      });

      try {
        const channel = await client.channels.fetch(REVIEW_CHANNEL_ID);
        const product = data2.products[order.productId];
        const plan = product?.plans?.find((p) => p.id === order.planId);
        const stars = "⭐".repeat(Number(rating));

        const embed = new EmbedBuilder()
          .setTitle(`${stars} (${rating}/5)`)
          .setColor(0xffaa00)
          .addFields(
            { name: "العميل / Customer", value: `<@${order.userId}>` },
            {
              name: "المنتج / Product",
              value: product ? product.name : order.productId
            },
            {
              name: "المدة / Plan",
              value: plan ? plan.name : order.planId
            },
            { name: "التعليق / Comment", value: comment }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      } catch (e) {
        console.error("Failed to send review to channel:", e);
      }
    }
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

  if (!pending.length) return;

  const order = pending[pending.length - 1];
  const product = data.products[order.productId];
  const plan = product?.plans?.find((p) => p.id === order.planId);

  const owner = await client.users.fetch(OWNER_ID);

  const embed = new EmbedBuilder()
    .setTitle("طلب جديد في انتظار الموافقة / New Order Pending")
    .setColor(0xffaa00)
    .addFields(
      { name: "Invoice / الفاتورة", value: `#${order.invoice}`, inline: true },
      {
        name: "Customer / العميل",
        value: `<@${order.userId}>`,
        inline: true
      },
      {
        name: "Product / المنتج",
        value: product ? product.name : order.productId,
        inline: true
      },
      {
        name: "Plan / المدة",
        value: plan ? plan.name : order.planId,
        inline: true
      },
      { name: "Payment", value: order.payment, inline: true }
    )
    .setDescription(`**Proof / الإثبات:**\n${message.content || "صورة مرفقة"}`)
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve|${order.invoice}`)
      .setLabel("✅ قبول / Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject|${order.invoice}`)
      .setLabel("❌ رفض / Reject")
      .setStyle(ButtonStyle.Danger)
  );

  await owner.send({ embeds: [embed], components: [row] });
  await message.reply(t(message.author.id, "proofReceived"));
}

// =============================================
// ============ SEND REVIEW REQUEST ============
// =============================================

async function sendReviewRequest(user, order, product, plan) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rate|1|${order.invoice}`)
      .setLabel("⭐ 1")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate|2|${order.invoice}`)
      .setLabel("⭐⭐ 2")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate|3|${order.invoice}`)
      .setLabel("⭐⭐⭐ 3")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate|4|${order.invoice}`)
      .setLabel("⭐⭐⭐⭐ 4")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`rate|5|${order.invoice}`)
      .setLabel("⭐⭐⭐⭐⭐ 5")
      .setStyle(ButtonStyle.Primary)
  );

  await user.send({
    content: t(user.id, "reviewAsk"),
    components: [row]
  });
}

// =============================================
// ============== DASHBOARD BACKEND ============
// =============================================

const adminSessions = {};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Login
app.post("/api/admin/login", (req, res) => {
  const pw = (req.body && req.body.password) || "";
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }
  const token = createToken();
  adminSessions[token] = { createdAt: Date.now() };
  res.json({ token });
});

function adminAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !adminSessions[token]) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Stats
app.get("/api/stats", (req, res) => {
  const data = loadData();
  const products = Object.values(data.products || {});
  let totalPlans = 0;
  let totalKeys = 0;
  products.forEach((p) => {
    (p.plans || []).forEach((pl) => {
      totalPlans++;
      totalKeys += (pl.keys || []).filter((k) => !k.used).length;
    });
  });
  const totalProducts = products.length;
  const totalOrders = Object.keys(data.orders || {}).length;
  const totalReviews = (data.reviews || []).length;
  res.json({ totalProducts, totalPlans, totalKeys, totalOrders, totalReviews });
});

// Products (with plans)
app.get("/api/products", adminAuth, (req, res) => {
  const data = loadData();
  const products = Object.values(data.products || {}).map((p) => ({
    id: p.id,
    name: p.name,
    plans: (p.plans || []).map((pl) => ({
      id: pl.id,
      name: pl.name,
      price: pl.price,
      stock: (pl.keys || []).filter((k) => !k.used).length
    }))
  }));
  res.json(products);
});

// Orders
app.get("/api/orders", adminAuth, (req, res) => {
  const data = loadData();
  const arr = Object.values(data.orders || {}).sort(
    (a, b) => b.timestamp - a.timestamp
  );
  const productsMap = data.products || {};
  const orders = arr.map((o) => {
    const prod = productsMap[o.productId];
    const plan = prod?.plans?.find((p) => p.id === o.planId);
    return {
      invoice: o.invoice,
      userId: o.userId,
      productId: o.productId,
      productName: prod ? prod.name : o.productId,
      planId: o.planId,
      planName: plan ? plan.name : o.planId,
      payment: o.payment,
      status: o.status,
      timestamp: o.timestamp
    };
  });
  res.json(orders);
});

// Reviews
app.get("/api/reviews", adminAuth, (req, res) => {
  const data = loadData();
  const reviews = (data.reviews || [])
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp);
  const products = data.products || {};
  const arr = reviews.map((r) => {
    const prod = products[r.productId];
    const plan = prod?.plans?.find((p) => p.id === r.planId);
    return {
      userId: r.userId,
      productId: r.productId,
      productName: prod ? prod.name : r.productId,
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
// ============== DASHBOARD FRONTEND ===========
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
  .app { min-height:100vh; padding:16px; background:radial-gradient(circle at top,#0f172a 0,#020617 55%); }
  .card { background:rgba(15,23,42,0.96); border-radius:18px; padding:18px 20px; box-shadow:0 18px 40px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.18); }
  .login-wrap { max-width:420px; margin:40px auto; }
  h1 { font-size:22px; font-weight:700; margin-bottom:6px; }
  p { font-size:13px; color:#9ca3af; }
  input, button { font-family:inherit; }
  input[type=password] {
    width:100%; margin-top:10px; padding:9px 11px; border-radius:999px; border:1px solid #4b5563;
    background:#020617; color:#e5e7eb; outline:none; font-size:13px;
  }
  input[type=password]:focus { border-color:#0ea5e9; }
  .btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 14px; border-radius:999px; border:none; cursor:pointer; font-size:13px; font-weight:500; transition:transform .08s ease, box-shadow .12s ease, background .12s ease; }
  .btn:active { transform:scale(.97); box-shadow:none; }
  .btn-primary { background:linear-gradient(135deg,#06b6d4,#4f46e5); color:#0b1120; box-shadow:0 10px 30px rgba(59,130,246,0.4); }
  .btn-primary:hover { background:linear-gradient(135deg,#0ea5e9,#6366f1); }
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

  .layout { display:flex; gap:18px; margin-top:22px; }
  .sidebar { width:230px; background:rgba(15,23,42,0.98); border-radius:18px; padding:14px 12px; box-shadow:0 18px 40px rgba(15,23,42,0.9); border:1px solid rgba(148,163,184,0.25); }
  .sidebar-title { font-size:18px; font-weight:700; margin-bottom:10px; }
  .nav-btn { width:100%; display:flex; align-items:center; gap:8px; padding:8px 10px; margin-bottom:6px; border-radius:12px; border:none; background:transparent; color:#e5e7eb; font-size:13px; cursor:pointer; text-align:left; }
  .nav-btn span.icon { font-size:16px; }
  .nav-btn.active { background:linear-gradient(135deg,rgba(56,189,248,0.16),rgba(129,140,248,0.16)); box-shadow:0 0 0 1px rgba(56,189,248,0.7); }
  .nav-footer { margin-top:14px; border-top:1px solid #1f2937; padding-top:10px; font-size:11px; color:#9ca3af; }

  .main { flex:1; min-width:0; }
  .main-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .main-header h2 { font-size:20px; font-weight:700; }
  .main-header-right { display:flex; align-items:center; gap:8px; font-size:12px; color:#9ca3af; }

  .views { }
  .view { display:none; }
  .view.active { display:block; }

  .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-top:10px; }
  .stat-card { position:relative; overflow:hidden; }
  .stat-card h3 { font-size:12px; color:#9ca3af; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.08em; }
  .stat-card .value { font-size:26px; font-weight:700; margin-top:2px; }
  .stat-card::after {
    content:""; position:absolute; inset:auto -40px -40px auto; width:80px; height:80px;
    background:radial-gradient(circle,#38bdf8 0,transparent 55%); opacity:.18;
  }

  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }
  th, td { padding:7px 9px; border-bottom:1px solid #111827; }
  th { background:#020617; color:#9ca3af; font-weight:500; text-align:left; position:sticky; top:0; z-index:1; }
  tr:hover td { background:#030712; }

  .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:11px; }
  .tag-pending { background:#f97316; color:#111827; }
  .tag-completed { background:#22c55e; color:#052e16; }
  .tag-rejected { background:#ef4444; color:#450a0a; }

  .card-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin-top:10px; }
  .pill { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:11px; background:#111827; color:#e5e7eb; }

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
    <h1>P9 Shop Admin</h1>
    <p>Login with <code>ADMIN_PASSWORD</code> from Render / Replit secrets.</p>
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
    <aside class="sidebar card">
      <div class="sidebar-title">Dashboard</div>
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
          <div class="main-header-right">
            <span id="lastUpdated">–</span>
          </div>
        </div>
        <div class="views">
          <section id="view-stats" class="view active">
            <div class="stat-grid">
              <div class="card stat-card">
                <h3>Products</h3>
                <div class="value" id="statProducts">-</div>
              </div>
              <div class="card stat-card">
                <h3>Plans</h3>
                <div class="value" id="statPlans">-</div>
              </div>
              <div class="card stat-card">
                <h3>Available Keys</h3>
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
            <h3 class="text-sm" style="color:#9ca3af;">Products &amp; Plans</h3>
            <table id="productsTable">
              <thead>
                <tr><th>Product</th><th>Plan</th><th>Price</th><th>Stock</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </section>

          <section id="view-orders" class="view">
            <h3 class="text-sm" style="color:#9ca3af;">Recent Orders</h3>
            <table id="ordersTable">
              <thead>
                <tr><th>Invoice</th><th>User</th><th>Product</th><th>Plan</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody></tbody>
            </table>
          </section>

          <section id="view-reviews" class="view">
            <h3 class="text-sm" style="color:#9ca3af;">Latest Reviews</h3>
            <div id="reviewsContainer" class="card-grid mt8"></div>
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
    .then(() => setLoginStatus('Backend OK', true))
    .catch(() => setLoginStatus('Backend not responding', false));
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
    view === 'reviews' ? 'Reviews' : view;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  var active = document.getElementById('view-' + view);
  if (active) active.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  var btn = document.querySelector('.nav-btn[data-view="' + view + '"]');
  if (btn) btn.classList.add('active');

  updateTimestamp();
  if (view === 'stats') loadStats();
  if (view === 'products') loadProducts();
  if (view === 'orders') loadOrders();
  if (view === 'reviews') loadReviews();
}

function refreshCurrent() { setView(currentView); }

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
    document.getElementById('statPlans').textContent = s.totalPlans;
    document.getElementById('statKeys').textContent = s.totalKeys;
    document.getElementById('statOrders').textContent = s.totalOrders;
    document.getElementById('statReviews').textContent = s.totalReviews;
  } catch (e) {
    console.error(e);
  }
}

async function loadProducts() {
  try {
    const res = await authedFetch('/api/products');
    const products = await res.json();
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    products.forEach(p => {
      if (!p.plans || !p.plans.length) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + p.name + ' (' + p.id + ')</td><td>-</td><td>-</td><td>-</td>';
        tbody.appendChild(tr);
      } else {
        p.plans.forEach(pl => {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + p.name + ' (' + p.id + ')</td>' +
            '<td>' + pl.name + ' (' + pl.id + ')</td>' +
            '<td>' + pl.price + '</td>' +
            '<td>' + pl.stock + '</td>';
          tbody.appendChild(tr);
        });
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrders() {
  try {
    const res = await authedFetch('/api/orders');
    const orders = await res.json();
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';
    orders.forEach(o => {
      var tr = document.createElement('tr');
      var statusClass =
        o.status === 'completed' ? 'tag tag-completed' :
        o.status === 'rejected' ? 'tag tag-rejected' :
        'tag tag-pending';
      tr.innerHTML =
        '<td>#' + o.invoice + '</td>' +
        '<td>' + o.userId + '</td>' +
        '<td>' + o.productName + '</td>' +
        '<td>' + o.planName + '</td>' +
        '<td>' + o.payment + '</td>' +
        '<td><span class="' + statusClass + '">' + o.status + '</span></td>';
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadReviews() {
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
      for (var i = 0; i < r.rating; i++) stars += '⭐';
      card.innerHTML =
        '<div>' + stars + ' (' + r.rating + '/5)</div>' +
        '<div class="small mt8">User: ' + r.userId + '</div>' +
        '<div class="small">Product: ' + r.productName + '</div>' +
        '<div class="small">Plan: ' + r.planName + '</div>' +
        '<div class="mt8 text-sm">' + (r.comment || 'No comment') + '</div>' +
        '<div class="small mt8">' + new Date(r.timestamp).toLocaleString() + '</div>';
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
  console.log(`🌐 Dashboard running on port ${PORT}`);
});

client.login(TOKEN);
