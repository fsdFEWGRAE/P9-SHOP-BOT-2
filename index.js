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
  Partials,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const express = require("express");

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
const PORT = process.env.PORT || 3000;

// معلومات الدفع (عدلها من env في Render)
const PAYMENT_INFO = {
  paypal: process.env.PAYPAL_INFO || "PayPal: your-email@example.com",
  stc: process.env.STC_PAY_INFO || "STC Pay: 05XXXXXXXX",
  barq: process.env.BARQ_INFO || "Barq: your-username",
  bank: process.env.BANK_INFO || "Bank IBAN: SA00 0000 0000 0000",
  ticket:
    process.env.TICKET_INFO ||
    "افتح تذكرة في روم الشراء لتمام عملية الدفع / Open a ticket in the purchase channel."
};

// =========== Translations ===========
const translations = {
  en: {
    chooseLanguage: "Choose your language:",
    langArabicButton: "Arabic 🇸🇦",
    langEnglishButton: "English 🇬🇧",
    languageUpdatedAr: "Language changed to Arabic 🇸🇦",
    languageUpdatedEn: "Language changed to English 🇬🇧",

    shopButtonText: "🛒 Open Shop",
    shopOpened: "Select a product to start your order:",
    noProducts: "No products are available right now.",
    noPlans: "This product has no durations configured.",
    selectProduct: "Select a product:",
    selectPlan: "Select duration:",
    selectPayment: "Select your payment method:",
    paymentOptionsTitle: "Payment Method",
    invoiceSent: "Invoice sent to your DM.",
    invoiceTitle: "Payment Invoice",
    sendProof: "Please send your payment proof here (message or image).",

    paymentPaypal: "PayPal",
    paymentSTC: "STC Pay",
    paymentBarq: "Barq",
    paymentBank: "Bank Transfer",
    paymentTicket: "Open Ticket",

    ownerNewOrderTitle: "New Order Pending",
    proofReceived: "Payment proof received. Waiting for approval…",

    notOwner: "You are not authorized to use this command.",
    productAdded: "Product added successfully.",
    planAdded: "Plan added successfully.",
    keyAdded: "Key added successfully.",
    productNotFound: "Product not found.",
    planNotFound: "Plan not found.",

    stockHeader: "Stock status:",
    stockNoProducts: "No products at the moment.",
    stockLineProduct: "Product",
    stockLinePlan: "Plan",
    stockKeys: "Keys",

    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order has been rejected.",
    rateExperience: "Please rate your experience:",
    reviewReceived: "Thanks for your review!"
  },
  ar: {
    chooseLanguage: "اختر لغتك:",
    langArabicButton: "العربية 🇸🇦",
    langEnglishButton: "English 🇬🇧",
    languageUpdatedAr: "تم تغيير اللغة إلى العربية 🇸🇦",
    languageUpdatedEn: "Language changed to English 🇬🇧",

    shopButtonText: "🛒 فتح المتجر",
    shopOpened: "اختر منتجاً لبدء الطلب:",
    noProducts: "لا توجد منتجات حالياً.",
    noPlans: "هذا المنتج لا يحتوي على فترات/خطط.",
    selectProduct: "اختر المنتج:",
    selectPlan: "اختر المدة:",
    selectPayment: "اختر وسيلة الدفع:",
    paymentOptionsTitle: "طريقة الدفع",
    invoiceSent: "تم إرسال الفاتورة إلى الخاص.",
    invoiceTitle: "فاتورة الدفع",
    sendProof: "أرسل هنا إثبات الدفع (رسالة أو صورة).",

    paymentPaypal: "باي بال",
    paymentSTC: "STC Pay",
    paymentBarq: "بارق",
    paymentBank: "تحويل بنكي",
    paymentTicket: "فتح تذكرة شراء",

    ownerNewOrderTitle: "طلب جديد في انتظار الموافقة",
    proofReceived: "تم استلام إثبات الدفع، في انتظار الموافقة…",

    notOwner: "لا تملك صلاحية استخدام هذا الأمر.",
    productAdded: "تم إضافة المنتج بنجاح.",
    planAdded: "تمت إضافة الفترة/الخطة بنجاح.",
    keyAdded: "تم إضافة المفتاح.",
    productNotFound: "المنتج غير موجود.",
    planNotFound: "الفترة/الخطة غير موجودة.",

    stockHeader: "حالة المخزون:",
    stockNoProducts: "لا توجد منتجات حالياً.",
    stockLineProduct: "المنتج",
    stockLinePlan: "المدة",
    stockKeys: "عدد المفاتيح",

    orderApproved: "تمت الموافقة على طلبك! هذا مفتاحك:",
    orderRejected: "تم رفض طلبك.",
    rateExperience: "يرجى تقييم تجربتك:",
    reviewReceived: "شكراً على تقييمك!"
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
      products: {}, // productId => { id, name, plans: [ { id, name, price, keys:[{value, used}] } ] }
      orders: {}, // invoice => order
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
  return (
    (translations[lang] && translations[lang][key]) ||
    (translations.en && translations.en[key]) ||
    key
  );
}

// =========== Ready ===========
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =============================================
// ============ MESSAGE COMMANDS ===============
// =============================================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // DM → Payment proof
  if (message.channel.type === ChannelType.DM) {
    return handleDMProof(message);
  }

  // لغة / شوب (بدون prefix) لو حاب
  // ...

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // ---------- Send Language Panel ----------
  if (command === "sendlang") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("lang_ar")
        .setLabel(translations.ar.langArabicButton)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("lang_en")
        .setLabel(translations.en.langEnglishButton)
        .setStyle(ButtonStyle.Secondary)
    );

    return message.channel.send({
      content: `${translations.ar.chooseLanguage}\n${translations.en.chooseLanguage}`,
      components: [row]
    });
  }

  // ---------- Send Shop Button ----------
  if (command === "sendshop" || command === "sendshopbutton") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_shop")
        .setLabel("🛒 المتجر | Shop")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({
      content: "اضغط لفتح المتجر / Click to open shop:",
      components: [row]
    });
  }

  // ========== Admin Only Commands ==========
  if (command === "addproduct") {
    if (message.author.id !== OWNER_ID)
      return message.reply(t(message.author.id, "notOwner"));

    const parts = args.join(" ").split("|").map((p) => p.trim());
    // -addproduct id | name
    if (parts.length < 2) {
      return message.reply("Usage: -addproduct productId | product name");
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

  if (command === "addplan") {
    if (message.author.id !== OWNER_ID)
      return message.reply(t(message.author.id, "notOwner"));

    const parts = args.join(" ").split("|").map((p) => p.trim());
    // -addplan productId | planId | planName | price
    if (parts.length < 4) {
      return message.reply(
        "Usage: -addplan productId | planId | plan name | price"
      );
    }

    const [productId, planId, planName, priceStr] = parts;
    const price = parseFloat(priceStr);
    const data = loadData();

    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    if (!Array.isArray(product.plans)) product.plans = [];

    const existing = product.plans.find((p) => p.id === planId);
    if (existing) {
      existing.name = planName;
      existing.price = price;
    } else {
      product.plans.push({
        id: planId,
        name: planName,
        price: price,
        keys: []
      });
    }

    saveData(data);
    return message.reply(t(message.author.id, "planAdded"));
  }

  if (command === "addkey") {
    if (message.author.id !== OWNER_ID)
      return message.reply(t(message.author.id, "notOwner"));

    const parts = args.join(" ").split("|").map((p) => p.trim());
    // -addkey productId | planId | keyValue
    if (parts.length < 3) {
      return message.reply(
        "Usage: -addkey productId | planId | KEY-VALUE-HERE"
      );
    }

    const [productId, planId, keyValue] = parts;
    const data = loadData();

    const product = data.products[productId];
    if (!product) return message.reply(t(message.author.id, "productNotFound"));

    const plan = (product.plans || []).find((p) => p.id === planId);
    if (!plan) return message.reply(t(message.author.id, "planNotFound"));

    if (!Array.isArray(plan.keys)) plan.keys = [];
    plan.keys.push({ value: keyValue, used: false });

    saveData(data);
    return message.reply(t(message.author.id, "keyAdded"));
  }

  if (command === "stock") {
    const data = loadData();
    const products = Object.values(data.products);

    if (!products.length) {
      return message.reply(t(message.author.id, "stockNoProducts"));
    }

    let msg = `📦 **${t(message.author.id, "stockHeader")}**\n\n`;

    products.forEach((prod) => {
      msg += `🧾 **${t(
        message.author.id,
        "stockLineProduct"
      )}:** ${prod.name} (${prod.id})\n`;

      (prod.plans || []).forEach((plan) => {
        const stock = (plan.keys || []).filter((k) => !k.used).length;
        let color = "🟩"; // ممتاز
        if (stock === 0) color = "🟥";
        else if (stock < 5) color = "🟧";

        msg += `  ${color} **${
          t(message.author.id, "stockLinePlan") + ":"
        } ${plan.name}** — ${t(
          message.author.id,
          "stockKeys"
        )}: **${stock}**\n`;
      });

      msg += "\n";
    });

    return message.reply(msg);
  }

  if (command === "lang") {
    const lang = args[0]?.toLowerCase();
    if (!["ar", "en"].includes(lang)) {
      return message.reply("Usage: -lang ar / en");
    }
    const data = loadData();
    data.userLanguages[message.author.id] = lang;
    saveData(data);
    if (lang === "ar") {
      return message.reply(translations.ar.languageUpdatedAr);
    } else {
      return message.reply(translations.en.languageUpdatedEn);
    }
  }
});

// =============================================
// ========= INTERACTIONS (BUTTONS/MENUS) ======
// =============================================

client.on("interactionCreate", async (interaction) => {
  const data = loadData();

  // ---------- Language Buttons ----------
  if (interaction.isButton()) {
    if (interaction.customId === "lang_ar") {
      data.userLanguages[interaction.user.id] = "ar";
      saveData(data);
      return interaction.reply({
        content: translations.ar.languageUpdatedAr,
        ephemeral: true
      });
    }
    if (interaction.customId === "lang_en") {
      data.userLanguages[interaction.user.id] = "en";
      saveData(data);
      return interaction.reply({
        content: translations.en.languageUpdatedEn,
        ephemeral: true
      });
    }

    // ---------- Open Shop Button ----------
    if (interaction.customId === "open_shop") {
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
        content: t(interaction.user.id, "shopOpened"),
        components: [row],
        ephemeral: true
      });
    }

    // ---------- Approve / Reject (Owner) ----------
    if (interaction.customId.startsWith("approve|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: "❌ Not allowed.", ephemeral: true });
      }

      const invoice = interaction.customId.split("|")[1];
      const order = data.orders[invoice];
      if (!order) {
        return interaction.reply({
          content: "❌ Order not found.",
          ephemeral: true
        });
      }

      const product = data.products[order.productId];
      if (!product) {
        return interaction.reply({
          content: "❌ Product missing.",
          ephemeral: true
        });
      }
      const plan = (product.plans || []).find((p) => p.id === order.planId);
      if (!plan) {
        return interaction.reply({
          content: "❌ Plan missing.",
          ephemeral: true
        });
      }

      const keyObj = (plan.keys || []).find((k) => !k.used);
      if (!keyObj) {
        return interaction.reply({
          content: "❌ No keys available for this plan.",
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
        content: `✅ Order #${invoice} approved and key delivered.`,
        components: []
      });
    }

    if (interaction.customId.startsWith("reject|")) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: "❌ Not allowed.", ephemeral: true });
      }

      const invoice = interaction.customId.split("|")[1];
      const order = data.orders[invoice];
      if (!order) {
        return interaction.reply({
          content: "❌ Order not found.",
          ephemeral: true
        });
      }

      order.status = "rejected";
      saveData(data);

      const user = await client.users.fetch(order.userId);
      await user.send(t(order.userId, "orderRejected"));

      return interaction.update({
        content: `❌ Order #${invoice} rejected.`,
        components: []
      });
    }

    // ---------- Rate Buttons ----------
    if (interaction.customId.startsWith("rate|")) {
      const [_, rating, invoice] = interaction.customId.split("|");

      const modal = new ModalBuilder()
        .setCustomId(`review_modal|${rating}|${invoice}`)
        .setTitle("إضافة تقييم / Add Review");

      const txt = new TextInputBuilder()
        .setCustomId("comment")
        .setLabel("اكتب تعليقاً (اختياري) / Comment (optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(txt));

      return interaction.showModal(modal);
    }
  }

  // ---------- Select Menus ----------
  if (interaction.isStringSelectMenu()) {
    // select_product
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
        label: `${pl.name} (${pl.price})`,
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

    // select_plan
    if (interaction.customId === "select_plan") {
      const [productId, planId] = interaction.values[0].split("|");
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

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_payment|${productId}|${planId}`)
          .setPlaceholder(t(interaction.user.id, "selectPayment"))
          .addOptions([
            {
              label: t(interaction.user.id, "paymentPaypal"),
              value: "paypal"
            },
            {
              label: t(interaction.user.id, "paymentSTC"),
              value: "stc"
            },
            {
              label: t(interaction.user.id, "paymentBarq"),
              value: "barq"
            },
            {
              label: t(interaction.user.id, "paymentBank"),
              value: "bank"
            },
            {
              label: t(interaction.user.id, "paymentTicket"),
              value: "ticket"
            }
          ])
      );

      return interaction.reply({
        content: t(interaction.user.id, "selectPayment"),
        components: [row],
        ephemeral: true
      });
    }

    // select_payment
    if (interaction.customId.startsWith("select_payment|")) {
      const [_, productId, planId] = interaction.customId.split("|");
      const payment = interaction.values[0];

      const product = data.products[productId];
      const plan = (product.plans || []).find((p) => p.id === planId);

      if (!product || !plan) {
        return interaction.reply({
          content: "❌ Product/Plan not found.",
          ephemeral: true
        });
      }

      const data2 = loadData();
      const invoice = data2.invoiceCounter++;
      data2.orders[invoice] = {
        invoice: invoice,
        userId: interaction.user.id,
        productId,
        planId,
        payment,
        status: "pending",
        timestamp: Date.now()
      };
      saveData(data2);

      // DM Invoice
      const payInfo =
        payment === "paypal"
          ? PAYMENT_INFO.paypal
          : payment === "stc"
          ? PAYMENT_INFO.stc
          : payment === "barq"
          ? PAYMENT_INFO.barq
          : payment === "bank"
          ? PAYMENT_INFO.bank
          : PAYMENT_INFO.ticket;

      const embed = new EmbedBuilder()
        .setTitle(`${t(interaction.user.id, "invoiceTitle")} #${invoice}`)
        .setColor(0x28b0f5)
        .addFields(
          { name: "Product / المنتج", value: product.name, inline: true },
          { name: "Plan / المدة", value: plan.name, inline: true },
          { name: "Price / السعر", value: String(plan.price), inline: true },
          {
            name: t(interaction.user.id, "paymentOptionsTitle"),
            value: `${payment.toUpperCase()}\n${payInfo}`
          }
        )
        .setFooter({ text: t(interaction.user.id, "sendProof") })
        .setTimestamp();

      try {
        await interaction.user.send({ embeds: [embed] });
      } catch (e) {
        console.error("Failed to DM invoice:", e);
      }

      return interaction.reply({
        content: t(interaction.user.id, "invoiceSent"),
        ephemeral: true
      });
    }
  }

  // ---------- Review Modal ----------
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("review_modal|")) {
      const [_, ratingStr, invoice] = interaction.customId.split("|");
      const rating = Number(ratingStr);

      const data3 = loadData();
      const order = data3.orders[invoice];
      if (!order) {
        return interaction.reply({
          content: "❌ Order not found.",
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

      data3.reviews.push(review);
      saveData(data3);

      await interaction.reply({
        content: t(order.userId, "reviewReceived"),
        ephemeral: true
      });

      const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
      const product = data3.products[order.productId];
      const plan =
        product && (product.plans || []).find((p) => p.id === order.planId);

      const stars = "⭐".repeat(rating);

      const embed = new EmbedBuilder()
        .setTitle(`${stars} (${rating}/5)`)
        .setColor(0xffaa00)
        .addFields(
          { name: "Client / العميل", value: `<@${order.userId}>` },
          { name: "Product / المنتج", value: product ? product.name : "-" },
          { name: "Plan / المدة", value: plan ? plan.name : "-" },
          { name: "Comment / التعليق", value: comment }
        )
        .setTimestamp();

      await reviewChannel.send({ embeds: [embed] });
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
  const plan =
    product && (product.plans || []).find((p) => p.id === order.planId);

  const owner = await client.users.fetch(OWNER_ID);

  const embed = new EmbedBuilder()
    .setTitle(t(owner.id, "ownerNewOrderTitle"))
    .setColor(0xffaa00)
    .addFields(
      { name: "Invoice / الفاتورة", value: `#${order.invoice}`, inline: true },
      {
        name: "Client / العميل",
        value: `<@${order.userId}>`,
        inline: true
      },
      {
        name: "Product / المنتج",
        value: product ? product.name : "-",
        inline: true
      },
      {
        name: "Plan / المدة",
        value: plan ? plan.name : "-",
        inline: true
      },
      {
        name: "Payment / الدفع",
        value: order.payment.toUpperCase(),
        inline: true
      }
    )
    .setDescription(`**Proof / الإثبات:**\n${message.content || "Image"}`)
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
// =============== EXPRESS / DASH ==============
// =============================================

// صفحة Space Neon بسيطة
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>P9 Shop Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    min-height:100vh;
    font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    background:radial-gradient(circle at top,#1d2440,#05010a 55%,#000 90%);
    color:#e5e7eb;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .card{
    background:rgba(15,23,42,0.9);
    border-radius:24px;
    padding:28px 32px;
    box-shadow:0 25px 80px rgba(0,0,0,0.9);
    border:1px solid rgba(129,140,248,0.4);
    max-width:420px;
    width:100%;
    position:relative;
    overflow:hidden;
  }
  .glow{
    position:absolute;
    width:190px;
    height:190px;
    border-radius:999px;
    background:radial-gradient(circle,#6366f1,#ec4899,transparent 70%);
    opacity:0.45;
    filter:blur(4px);
    top:-40px;
    right:-40px;
    pointer-events:none;
  }
  h1{
    font-size:24px;
    font-weight:700;
    margin-bottom:8px;
  }
  p{
    font-size:13px;
    color:#9ca3af;
    margin-bottom:12px;
  }
  .pill{
    display:inline-flex;
    align-items:center;
    gap:6px;
    padding:4px 10px;
    border-radius:999px;
    background:rgba(30,64,175,0.7);
    font-size:11px;
    margin-bottom:12px;
  }
  .status-dot{
    width:8px;
    height:8px;
    border-radius:999px;
    background:#22c55e;
    box-shadow:0 0 10px #22c55e;
  }
  .meta{
    font-size:11px;
    color:#6b7280;
    margin-top:10px;
  }
</style>
</head>
<body>
<div class="card">
  <div class="glow"></div>
  <div class="pill"><span class="status-dot"></span><span>Bot & API Online</span></div>
  <h1>P9 Shop Dashboard</h1>
  <p>Space Neon panel for P9 Shop bot. The bot, API, and payment system are running on this instance.</p>
  <p style="font-size:12px">Use Discord commands to manage products, plans and keys:<br/><code>-addproduct</code>, <code>-addplan</code>, <code>-addkey</code>, <code>-stock</code>, <code>-sendshop</code>, <code>-sendlang</code>.</p>
  <div class="meta">Render / Node.js service · P9 SHOP</div>
</div>
</body>
</html>`);
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// =============================================
// ============== START SERVER =================
// =============================================

app.listen(PORT, () => {
  console.log(`🌐 HTTP server running on port ${PORT}`);
});

client.login(TOKEN);
