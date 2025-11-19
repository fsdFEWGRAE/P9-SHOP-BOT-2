// ================== Imports ==================
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

// ================== Basic Config ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel] // لاستقبال رسائل الخاص
});

const REVIEW_CHANNEL_ID = "1438169825489719326";
const PREFIX = "-";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const PORT = process.env.PORT || 5050;

// ================== Translations ==================
const translations = {
  en: {
    productAdded: "Product added successfully!",
    keyAdded: "Key added successfully to period!",
    productNotFound: "Product not found!",
    periodNotFound: "Period not found for this product!",
    selectProduct: "Select a product to buy:",
    selectPeriod: "Select the plan / period:",
    selectPayment: "Select your payment method:",
    noProducts: "No products available!",
    noPeriods: "This product has no plans available!",
    noStock: "This period is out of stock!",
    invoiceTitle: "Payment Invoice",
    invoiceNumber: "Invoice Number",
    product: "Product",
    period: "Period",
    price: "Price",
    paymentMethod: "Payment Method",
    sendProof: "Please send your payment proof as an image or message.",
    proofReceived: "Payment proof received! Waiting for owner approval...",
    orderApproved: "Your order has been approved! Here is your key:",
    orderRejected: "Your order has been rejected.",
    approveOrder: "Approve Order",
    rejectOrder: "Reject Order",
    discountAdded: "Discount code created successfully!",
    discountApplied: "Discount code applied! You will get {percent}% off your next purchase.",
    discountInvalid: "Invalid or expired discount code!",
    discountUsed: "You already have a discount applied!",
    rateExperience: "Please rate your experience:",
    reviewReceived: "Thank you for your review!",
    languageChanged: "Language changed to English!",
    customer: "Customer",
    comment: "Comment",
    orderPending: "New Order Pending Approval"
  },
  ar: {
    productAdded: "تم إضافة المنتج بنجاح!",
    keyAdded: "تم إضافة المفاتيح للفترة بنجاح!",
    productNotFound: "المنتج غير موجود!",
    periodNotFound: "الفترة غير موجودة لهذا المنتج!",
    selectProduct: "اختر منتج للشراء:",
    selectPeriod: "اختر الفترة / الخطة:",
    selectPayment: "اختر طريقة الدفع:",
    noProducts: "لا توجد منتجات متاحة!",
    noPeriods: "لا توجد فترات متاحة لهذا المنتج!",
    noStock: "هذه الفترة غير متوفرة حالياً!",
    invoiceTitle: "فاتورة الدفع",
    invoiceNumber: "رقم الفاتورة",
    product: "المنتج",
    period: "الفترة",
    price: "السعر",
    paymentMethod: "طريقة الدفع",
    sendProof: "يرجى إرسال إثبات الدفع كصورة أو رسالة.",
    proofReceived: "تم استلام إثبات الدفع! في انتظار موافقة المالك...",
    orderApproved: "تمت الموافقة على طلبك! إليك المفتاح:",
    orderRejected: "تم رفض طلبك.",
    approveOrder: "قبول الطلب",
    rejectOrder: "رفض الطلب",
    discountAdded: "تم إنشاء كود الخصم بنجاح!",
    discountApplied: "تم تطبيق كود الخصم! ستحصل على خصم {percent}% على الشراء القادم.",
    discountInvalid: "كود خصم غير صالح أو منتهي!",
    discountUsed: "لديك بالفعل كود خصم مطبق!",
    rateExperience: "يرجى تقييم تجربتك:",
    reviewReceived: "شكراً لتقييمك!",
    languageChanged: "تم تغيير اللغة إلى العربية!",
    customer: "العميل",
    comment: "التعليق",
    orderPending: "طلب جديد في انتظار الموافقة"
  }
};

// ================== Data Helpers (data.json) ==================
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

    // تأكيد بنية الفترات لكل منتج
    for (const p of Object.values(data.products)) {
      p.keys = p.keys || [];
      p.periods = p.periods || {};

      // لو ما فيه فترات، نسوي واحدة افتراضية من السعر القديم والمفاتيح القديمة
      if (Object.keys(p.periods).length === 0) {
        p.periods["default"] = {
          id: "default",
          label: "Default",
          price: p.price || 0,
          keys: (p.keys || []).map((k) =>
            typeof k === "string"
              ? { value: k, used: false }
              : { value: k.value, used: !!k.used }
          )
        };
      }

      // تأكد أن كل فترة فيها مصفوفة مفاتيح
      for (const per of Object.values(p.periods)) {
        per.keys = per.keys || [];
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
  return data.userLanguages[userId] || "en";
}

function t(userId, key, vars = {}) {
  const lang = getLang(userId);
  let text = translations[lang][key] || translations.en[key] || key;
  Object.keys(vars).forEach((v) => {
    text = text.replace(`{${v}}`, vars[v]);
  });
  return text;
}

// ================== Discord Bot ==================
client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  console.log(`📦 Serving ${Object.keys(loadData().products).length} products`);
});

// ================== MESSAGE HANDLER ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // لو مو أمر ويكتب في الخاص → نعتبره إثبات دفع
  if (!message.content.startsWith(PREFIX)) {
    if (message.channel.type === 1 /* DM */ || message.channel.type === "DM") {
      handleDMProof(message);
    }
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  // -------- help --------
  if (command === "help") {
    return message.reply(
      [
        "📜 **الأوامر المتاحة:**",
        "",
        "-help",
        "-addproduct id | name | price",
        "-addkey productId | keyValue (لفترة الافتراضية)",
        "-adddiscount CODE | PERCENT | MAX_USES(optional)",
        "-stock",
        "-buy",
        "-discount CODE",
        "-lang en / ar"
      ].join("\n")
    );
  }

  // -------- addproduct --------
  if (command === "addproduct") {
    if (message.author.id !== process.env.OWNER_ID) return;

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 3)
      return message.reply("Usage: -addproduct id | name | price");

    const [id, name, priceStr] = parts;
    const price = parseFloat(priceStr);
    if (isNaN(price)) return message.reply("Invalid price");

    const data = loadData();

    // منتج جديد مع فترة افتراضية
    data.products[id] = {
      id,
      name,
      price,
      keys: [],
      periods: {
        default: {
          id: "default",
          label: "Default",
          price,
          keys: []
        }
      }
    };

    saveData(data);
    return message.reply(t(message.author.id, "productAdded"));
  }

  // -------- stock --------
  if (command === "stock") {
    const data = loadData();
    const products = Object.values(data.products);

    if (products.length === 0) {
      return message.reply("❌ لا توجد منتجات حالياً.");
    }

    let msg = "📦 **حالة المخزون:**\n\n";

    products.forEach((p) => {
      const periods = Object.values(p.periods || {});
      let totalStock = 0;
      periods.forEach((per) => {
        totalStock += (per.keys || []).filter((k) => !k.used).length;
      });

      // لون حسب "إجمالي" المخزون
      let color = "🟩"; // ممتاز
      if (totalStock < 5) color = "🟧"; // قليل
      if (totalStock === 0) color = "🟥"; // منتهي

      msg += `${color} **${p.name}** — (${p.id})\n`;
      if (periods.length === 0) {
        msg += "   لا توجد فترات (plans) مسجلة.\n\n";
      } else {
        periods.forEach((per) => {
          const s = (per.keys || []).filter((k) => !k.used).length;
          msg += `   ▫️ ${per.label} (${per.id}) — 🗝️ **${s}**\n`;
        });
        msg += "\n";
      }
    });

    return message.reply(msg);
  }

  // -------- addkey (لفترة الافتراضية) --------
  if (command === "addkey") {
    if (message.author.id !== process.env.OWNER_ID) return;

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 2)
      return message.reply("Usage: -addkey productId | keyValue");

    const [productId, keyValue] = parts;
    const data = loadData();

    const product = data.products[productId];
    if (!product) {
      return message.reply(t(message.author.id, "productNotFound"));
    }

    product.periods = product.periods || {};
    if (!product.periods.default) {
      product.periods.default = {
        id: "default",
        label: "Default",
        price: product.price || 0,
        keys: []
      };
    }

    product.periods.default.keys.push({
      value: keyValue,
      used: false
    });

    saveData(data);
    return message.reply(t(message.author.id, "keyAdded"));
  }

  // -------- buy --------
  if (command === "buy") {
    const data = loadData();
    const products = Object.values(data.products);

    if (products.length === 0) {
      return message.reply(t(message.author.id, "noProducts"));
    }

    const options = products.map((p) => {
      // إجمالي المخزون
      let totalStock = 0;
      Object.values(p.periods || {}).forEach((per) => {
        totalStock += (per.keys || []).filter((k) => !k.used).length;
      });

      return {
        label: `${p.name}`,
        description: `Total stock: ${totalStock}`,
        value: p.id
      };
    });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_product")
        .setPlaceholder(t(message.author.id, "selectProduct"))
        .addOptions(options)
    );

    return message.reply({
      content: t(message.author.id, "selectProduct"),
      components: [row]
    });
  }

  // -------- adddiscount (من داخل الديسكورد) --------
  if (command === "adddiscount") {
    if (message.author.id !== process.env.OWNER_ID) return;

    const parts = args.join(" ").split("|").map((p) => p.trim());
    if (parts.length < 2)
      return message.reply(
        "Usage: -adddiscount CODE | PERCENT | MAX_USES(optional)"
      );

    const [code, percentStr, maxUsesStr] = parts;
    const percent = parseFloat(percentStr);
    const maxUses = maxUsesStr ? parseInt(maxUsesStr) : null;

    if (isNaN(percent)) return message.reply("Invalid percent");

    const data = loadData();
    data.discounts[code.toUpperCase()] = {
      percent,
      maxUses: maxUses || null,
      usedCount: 0
    };
    saveData(data);

    return message.reply(t(message.author.id, "discountAdded"));
  }

  // -------- discount --------
  if (command === "discount") {
    const code = args[0]?.toUpperCase();
    if (!code) return;

    const data = loadData();
    const discount = data.discounts[code];

    if (!discount) return message.reply(t(message.author.id, "discountInvalid"));
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

  // -------- lang --------
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
});

// ================== Interaction Handler ==================
client.on("interactionCreate", async (interaction) => {
  // ====== Select Menus ======
  if (interaction.isStringSelectMenu()) {
    // -------- select_product --------
    if (interaction.customId === "select_product") {
      const productId = interaction.values[0];
      const data = loadData();
      const product = data.products[productId];

      if (!product) {
        return interaction.reply({
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const periods = Object.values(product.periods || {});
      if (periods.length === 0) {
        return interaction.reply({
          content: t(interaction.user.id, "noPeriods"),
          ephemeral: true
        });
      }

      const options = periods.map((per) => {
        const stock = (per.keys || []).filter((k) => !k.used).length;
        return {
          label: `${per.label} - ${per.price}`,
          description: `Stock: ${stock}`,
          value: per.id
        };
      });

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_period_${productId}`)
          .setPlaceholder(t(interaction.user.id, "selectPeriod"))
          .addOptions(options)
      );

      return interaction.reply({
        content: t(interaction.user.id, "selectPeriod"),
        components: [row],
        ephemeral: true
      });
    }

    // -------- select_period_{productId} --------
    if (interaction.customId.startsWith("select_period_")) {
      const productId = interaction.customId.split("_")[2];
      const periodId = interaction.values[0];

      const data = loadData();
      const product = data.products[productId];
      if (!product) {
        return interaction.reply({
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const period = product.periods?.[periodId];
      if (!period) {
        return interaction.reply({
          content: t(interaction.user.id, "periodNotFound"),
          ephemeral: true
        });
      }

      const stock = (period.keys || []).filter((k) => !k.used).length;
      if (stock === 0) {
        return interaction.reply({
          content: t(interaction.user.id, "noStock"),
          ephemeral: true
        });
      }

      const paymentMethods = [
        { label: "PayPal", value: "paypal" },
        { label: "STC Pay", value: "stc" },
        { label: "Barq", value: "barq" },
        { label: "Gift Card", value: "giftcard" },
        { label: "Bank Transfer", value: "bank" }
      ];

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_payment_${productId}_${periodId}`)
          .setPlaceholder(t(interaction.user.id, "selectPayment"))
          .addOptions(paymentMethods)
      );

      return interaction.reply({
        content: t(interaction.user.id, "selectPayment"),
        components: [row],
        ephemeral: true
      });
    }

    // -------- select_payment_{productId}_{periodId} --------
    if (interaction.customId.startsWith("select_payment_")) {
      const parts = interaction.customId.split("_");
      // pattern: select_payment_{productId}_{periodId}
      const productId = parts[2];
      const periodId = parts[3] || "default";
      const paymentMethod = interaction.values[0];

      const data = loadData();
      const product = data.products[productId];
      if (!product) {
        return interaction.reply({
          content: t(interaction.user.id, "productNotFound"),
          ephemeral: true
        });
      }

      const period = product.periods?.[periodId];
      if (!period) {
        return interaction.reply({
          content: t(interaction.user.id, "periodNotFound"),
          ephemeral: true
        });
      }

      let price = period.price;
      const userDiscount = data.discountRedemptions[interaction.user.id];

      if (userDiscount && data.discounts[userDiscount]) {
        const discountPercent = data.discounts[userDiscount].percent;
        price = price - (price * discountPercent) / 100;
      }

      const invoiceNumber = data.invoiceCounter++;

      data.orders[invoiceNumber] = {
        invoiceNumber,
        userId: interaction.user.id,
        productId,
        periodId,
        periodLabel: period.label,
        paymentMethod,
        originalPrice: period.price,
        finalPrice: price,
        discount: userDiscount || null,
        status: "pending",
        timestamp: Date.now()
      };

      if (userDiscount) {
        data.discounts[userDiscount].usedCount++;
        delete data.discountRedemptions[interaction.user.id];
      }

      saveData(data);

      const embed = new EmbedBuilder()
        .setTitle(t(interaction.user.id, "invoiceTitle"))
        .setColor(0x00ae86)
        .addFields(
          {
            name: t(interaction.user.id, "invoiceNumber"),
            value: `#${invoiceNumber}`,
            inline: true
          },
          {
            name: t(interaction.user.id, "product"),
            value: product.name,
            inline: true
          },
          {
            name: t(interaction.user.id, "period"),
            value: period.label,
            inline: true
          },
          {
            name: t(interaction.user.id, "price"),
            value: `${price}`,
            inline: true
          },
          {
            name: t(interaction.user.id, "paymentMethod"),
            value: paymentMethod.toUpperCase(),
            inline: true
          }
        )
        .setFooter({ text: t(interaction.user.id, "sendProof") })
        .setTimestamp();

      await interaction.user.send({ embeds: [embed] });
      return interaction.reply({
        content: "✅ Invoice sent to your DM!",
        ephemeral: true
      });
    }
  }

  // ====== Buttons ======
  if (interaction.isButton()) {
    // -------- approve_{invoice} --------
    if (interaction.customId.startsWith("approve_")) {
      if (interaction.user.id !== process.env.OWNER_ID) return;

      const invoiceNumber = parseInt(interaction.customId.split("_")[1], 10);
      const data = loadData();
      const order = data.orders[invoiceNumber];
      if (!order) return;

      const product = data.products[order.productId];
      if (!product) return;

      const period = product.periods?.[order.periodId];
      if (!period) {
        return interaction.reply({
          content: "Period not found!",
          ephemeral: true
        });
      }

      const availableKey = (period.keys || []).find((k) => !k.used);
      if (!availableKey) {
        return interaction.reply({
          content: "No keys available for this period!",
          ephemeral: true
        });
      }

      availableKey.used = true;
      order.status = "completed";
      order.keyDelivered = availableKey.value;

      saveData(data);

      const buyer = await client.users.fetch(order.userId);
      await buyer.send(
        t(order.userId, "orderApproved") +
          `\n\`\`\`${availableKey.value}\`\`\``
      );

      await interaction.update({
        content: `✅ Order #${invoiceNumber} approved and key delivered.`,
        components: []
      });

      sendReviewRequest(buyer, order, product);
    }

    // -------- reject_{invoice} --------
    if (interaction.customId.startsWith("reject_")) {
      if (interaction.user.id !== process.env.OWNER_ID) return;

      const invoiceNumber = parseInt(interaction.customId.split("_")[1], 10);
      const data = loadData();
      const order = data.orders[invoiceNumber];
      if (!order) return;

      order.status = "rejected";

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

      const buyer = await client.users.fetch(order.userId);
      await buyer.send(t(order.userId, "orderRejected"));

      await interaction.update({
        content: `❌ Order #${invoiceNumber} rejected.`,
        components: []
      });
    }

    // -------- rate_X_invoice --------
    if (interaction.customId.startsWith("rate_")) {
      const parts = interaction.customId.split("_");
      const rating = parts[1];
      const invoiceNumber = parts[2];

      const modal = new ModalBuilder()
        .setCustomId(`review_${rating}_${invoiceNumber}`)
        .setTitle(`Review - ${rating} Star${rating > 1 ? "s" : ""}`);

      const commentInput = new TextInputBuilder()
        .setCustomId("comment")
        .setLabel("Comment (optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      const row = new ActionRowBuilder().addComponents(commentInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  }

  // ====== Modals ======
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("review_")) {
      const parts = interaction.customId.split("_");
      const rating = parseInt(parts[1], 10);
      const invoiceNumber = parts[2];

      const comment =
        interaction.fields.getTextInputValue("comment") || "No comment";

      const data = loadData();
      const order = data.orders[invoiceNumber];
      if (!order) {
        return interaction.reply({
          content: "Order not found!",
          ephemeral: true
        });
      }

      const product = data.products[order.productId];

      const review = {
        userId: interaction.user.id,
        productId: order.productId,
        rating,
        comment,
        timestamp: Date.now()
      };

      data.reviews.push(review);
      saveData(data);

      await interaction.reply({
        content: t(interaction.user.id, "reviewReceived"),
        ephemeral: true
      });

      const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
      const stars = "⭐".repeat(rating);

      const reviewEmbed = new EmbedBuilder()
        .setTitle(`${stars} (${rating}/5)`)
        .setColor(0xffd700)
        .addFields(
          {
            name: t(interaction.user.id, "customer"),
            value: `<@${interaction.user.id}>`,
            inline: true
          },
          {
            name: t(interaction.user.id, "product"),
            value: `${product ? product.name : order.productId} — ${
              order.finalPrice
            }`,
            inline: true
          },
          {
            name: t(interaction.user.id, "comment"),
            value: comment
          }
        )
        .setTimestamp();

      await reviewChannel.send({ embeds: [reviewEmbed] });
    }
  }
});

// ================== DM Helper ==================
async function handleDMProof(message) {
  const data = loadData();
  const userOrders = Object.values(data.orders).filter(
    (o) => o.userId === message.author.id && o.status === "pending"
  );

  if (userOrders.length === 0) return;

  const order = userOrders[userOrders.length - 1];
  const product = data.products[order.productId];

  const owner = await client.users.fetch(process.env.OWNER_ID);

  const embed = new EmbedBuilder()
    .setTitle(t(owner.id, "orderPending"))
    .setColor(0xff9900)
    .addFields(
      { name: "Invoice", value: `#${order.invoiceNumber}`, inline: true },
      { name: "Customer", value: `<@${message.author.id}>`, inline: true },
      {
        name: "Product",
        value: product ? product.name : order.productId,
        inline: true
      },
      {
        name: "Period",
        value: order.periodLabel || order.periodId || "N/A",
        inline: true
      },
      { name: "Price", value: `${order.finalPrice}`, inline: true },
      {
        name: "Payment Method",
        value: order.paymentMethod.toUpperCase(),
        inline: true
      }
    )
    .setDescription(
      `**Payment Proof:**\n${message.content || "See attachment"}`
    )
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

async function sendReviewRequest(user, order, product) {
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
    content: t(user.id, "rateExperience"),
    components: [row]
  });
}

// ================== Dashboard (Express) ==================
const app = express();
app.use(express.json());

// جلسات الأدمن في الذاكرة
const adminSessions = {};

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

// ---------- Dashboard HTML ----------
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
  h2 { font-size:20px; font-weight:700; }
  h3 { font-size:14px; font-weight:600; margin-bottom:4px; }
  p { font-size:13px; color:#9ca3af; }
  input, button, textarea { font-family:inherit; }
  input[type=password],
  input[type=text],
  input[type=number],
  textarea {
    width:100%; margin-top:6px; padding:8px 10px; border-radius:8px; border:1px solid #4b5563;
    background:#020617; color:#e5e7eb; outline:none; font-size:13px;
  }
  input:focus, textarea:focus { border-color:#0ea5e9; }
  textarea { min-height:80px; resize:vertical; }
  .btn { display:inline-flex; align-items:center; justify-content:center; padding:8px 14px; border-radius:999px; border:none; cursor:pointer; font-size:13px; font-weight:500; }
  .btn-primary { background:#06b6d4; color:#0f172a; }
  .btn-primary:hover { background:#0ea5e9; }
  .btn-ghost { background:transparent; border:1px solid #4b5563; color:#e5e7eb; }
  .btn-ghost:hover { border-color:#9ca3af; }
  .btn-danger { background:#ef4444; color:#0b0f19; }
  .btn-danger:hover { background:#f97373; }
  .mt4 { margin-top:4px; }
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
  th, td { padding:8px 10px; border-bottom:1px solid #111827; vertical-align:top; }
  th { background:#020617; color:#9ca3af; font-weight:500; text-align:left; }
  tr:hover td { background:#020617; }

  .tag { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:11px; }
  .tag-pending { background:#f97316; color:#111827; }
  .tag-completed { background:#22c55e; color:#052e16; }
  .tag-rejected { background:#ef4444; color:#450a0a; }

  .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:8px; }

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
  <!-- Login Card -->
  <div id="loginView" class="login-wrap card">
    <h1>Shop Admin Dashboard</h1>
    <p>Login using <code>ADMIN_PASSWORD</code> (from bot env / Render secrets).</p>
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

  <!-- Admin Layout -->
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
          <!-- Stats -->
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

          <!-- Products -->
          <section id="view-products" class="view">
            <div class="form-grid">
              <div class="card">
                <h3>Add Product</h3>
                <p class="small mt4">Creates a product with a default period using this price.</p>
                <div class="mt8">
                  <label class="small">Product ID</label>
                  <input id="p_id" />
                </div>
                <div class="mt8">
                  <label class="small">Name</label>
                  <input id="p_name" />
                </div>
                <div class="mt8">
                  <label class="small">Default Price</label>
                  <input id="p_price" type="number" step="0.01" />
                </div>
                <button class="btn btn-primary mt8" onclick="addProduct()">Add Product</button>
              </div>

              <div class="card">
                <h3>Add Period (Plan)</h3>
                <p class="small mt4">Example: 1d, 3d, 7d, 30d</p>
                <div class="mt8">
                  <label class="small">Product ID</label>
                  <input id="per_pid" placeholder="product id" />
                </div>
                <div class="mt8">
                  <label class="small">Period ID</label>
                  <input id="per_id" placeholder="e.g. 1d, 3d" />
                </div>
                <div class="mt8">
                  <label class="small">Label</label>
                  <input id="per_label" placeholder="1 Day / 3 Days / 1 Month" />
                </div>
                <div class="mt8">
                  <label class="small">Price</label>
                  <input id="per_price" type="number" step="0.01" />
                </div>
                <button class="btn btn-primary mt8" onclick="addPeriod()">Add / Update Period</button>
              </div>

              <div class="card">
                <h3>Add Keys For Period</h3>
                <div class="mt8">
                  <label class="small">Product ID</label>
                  <input id="k_pid" placeholder="product id" />
                </div>
                <div class="mt8">
                  <label class="small">Period ID</label>
                  <input id="k_period" placeholder="default / 1d / 3d ..." />
                </div>
                <div class="mt8">
                  <label class="small">Keys (one per line)</label>
                  <textarea id="k_values" placeholder="KEY-1&#10;KEY-2&#10;KEY-3"></textarea>
                </div>
                <button class="btn btn-primary mt8" onclick="addKeys()">Add Keys</button>
              </div>
            </div>

            <div class="card mt16">
              <h3>Products & Periods</h3>
              <table id="productsTable">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Base Price</th><th>Periods / Stock</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <!-- Orders -->
          <section id="view-orders" class="view">
            <div class="card">
              <h3>Recent Orders</h3>
              <table id="ordersTable">
                <thead>
                  <tr><th>Invoice</th><th>User</th><th>Product</th><th>Period</th><th>Price</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </section>

          <!-- Reviews -->
          <section id="view-reviews" class="view">
            <div class="card">
              <h3>Latest Reviews</h3>
              <div id="reviewsContainer" class="card-grid mt8"></div>
            </div>
          </section>

          <!-- Discounts -->
          <section id="view-discounts" class="view">
            <div class="card">
              <h3>Discount Codes</h3>
              <div class="form-grid mt8">
                <div>
                  <label class="small">Code</label>
                  <input id="d_code" placeholder="SUMMER20" />
                </div>
                <div>
                  <label class="small">Percent</label>
                  <input id="d_percent" type="number" step="1" placeholder="20" />
                </div>
                <div>
                  <label class="small">Max Uses (optional)</label>
                  <input id="d_maxUses" type="number" placeholder="e.g. 50" />
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
  if (view === 'products') loadProducts();
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

// ===== Stats =====
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

// ===== Products =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    products.forEach(p => {
      var tr = document.createElement('tr');
      var periodsHtml = '';
      if (p.periods && p.periods.length) {
        p.periods.forEach(per => {
          periodsHtml += '<div class="small">' +
            '<strong>' + per.label + '</strong> (' + per.id + ') - ' +
            'Price: ' + per.price + ' | Stock: ' + per.stock +
          '</div>';
        });
      } else {
        periodsHtml = '<div class="small">No periods</div>';
      }
      tr.innerHTML =
        '<td>' + p.id + '</td>' +
        '<td>' + p.name + '</td>' +
        '<td>' + (p.price != null ? p.price : '-') + '</td>' +
        '<td>' + periodsHtml + '</td>';
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

async function addPeriod() {
  if (!token) return alert('Login first');
  var pid = document.getElementById('per_pid').value.trim();
  var perId = document.getElementById('per_id').value.trim();
  var label = document.getElementById('per_label').value.trim();
  var price = parseFloat(document.getElementById('per_price').value);
  if (!pid || !perId || !label || isNaN(price)) {
    alert('Fill all period fields');
    return;
  }
  try {
    const res = await authedFetch('/api/products/' + encodeURIComponent(pid) + '/periods', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ periodId: perId, label: label, price: price })
    });
    if (!res.ok) {
      alert('Error adding period');
      return;
    }
    document.getElementById('per_pid').value = '';
    document.getElementById('per_id').value = '';
    document.getElementById('per_label').value = '';
    document.getElementById('per_price').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

async function addKeys() {
  if (!token) return alert('Login first');
  var pid = document.getElementById('k_pid').value.trim();
  var periodId = document.getElementById('k_period').value.trim();
  var raw = document.getElementById('k_values').value.trim();
  if (!pid || !periodId || !raw) {
    alert('Fill product id, period id and keys');
    return;
  }
  var keys = raw.split('\\n').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!keys.length) {
    alert('No keys provided');
    return;
  }
  try {
    const res = await authedFetch('/api/products/' + encodeURIComponent(pid) + '/periods/' + encodeURIComponent(periodId) + '/keys', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ keys: keys })
    });
    if (!res.ok) {
      alert('Error adding keys');
      return;
    }
    document.getElementById('k_pid').value = '';
    document.getElementById('k_period').value = '';
    document.getElementById('k_values').value = '';
    loadProducts();
    loadStats();
  } catch (e) {
    console.error(e);
  }
}

// ===== Orders =====
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
        '<td>' + (o.periodLabel || o.periodId || '-') + '</td>' +
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

// ===== Reviews =====
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

// ===== Discounts =====
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

// ================== REST API for Dashboard ==================

// Login
app.post("/api/admin/login", (req, res) => {
  const pw = (req.body && req.body.password) || "";
  if (!pw || pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_password" });
  }
  const token = createToken();
  adminSessions[token] = {
    createdAt: Date.now()
  };
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
  const totalProducts = Object.keys(data.products).length;

  let totalKeys = 0;
  Object.values(data.products).forEach((p) => {
    Object.values(p.periods || {}).forEach((per) => {
      totalKeys += (per.keys || []).filter((k) => !k.used).length;
    });
  });

  const totalOrders = Object.keys(data.orders).length;
  const totalReviews = data.reviews.length;
  res.json({ totalProducts, totalKeys, totalOrders, totalReviews });
});

// Reviews API
app.get("/api/reviews", adminAuth, (req, res) => {
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

// Discounts API
app.get("/api/discounts", adminAuth, (req, res) => {
  const data = loadData();
  const arr = Object.entries(data.discounts || {}).map(([code, info]) => ({
    code,
    percent: info.percent,
    usedCount: info.usedCount || 0,
    maxUses: info.maxUses || null
  }));
  res.json(arr);
});

app.post("/api/discounts", adminAuth, (req, res) => {
  const body = req.body || {};
  const code = body.code ? String(body.code).toUpperCase() : null;
  const percent =
    typeof body.percent === "number" ? body.percent : Number(body.percent);
  const maxUses = body.maxUses != null ? Number(body.maxUses) : null;

  if (!code || isNaN(percent)) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const data = loadData();
  data.discounts = data.discounts || {};
  const existing = data.discounts[code];
  data.discounts[code] = {
    percent,
    maxUses: isNaN(maxUses) ? null : maxUses,
    usedCount:
      existing && typeof existing.usedCount === "number"
        ? existing.usedCount
        : 0
  };
  saveData(data);
  res.json({ ok: true });
});

app.delete("/api/discounts/:code", adminAuth, (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const data = loadData();
  if (!data.discounts || !data.discounts[code]) {
    return res.status(404).json({ error: "not_found" });
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

// Products API (with periods)
app.get("/api/products", (req, res) => {
  const data = loadData();
  const arr = Object.values(data.products).map((p) => {
    const periods = Object.values(p.periods || {});
    let totalStock = 0;
    const periodArr = periods.map((per) => {
      const stock = (per.keys || []).filter((k) => !k.used).length;
      totalStock += stock;
      return {
        id: per.id,
        label: per.label,
        price: per.price,
        stock
      };
    });
    const firstPrice =
      p.price != null
        ? p.price
        : periods.length
        ? periods[0].price
        : null;
    return {
      id: p.id,
      name: p.name,
      price: firstPrice,
      stock: totalStock,
      periods: periodArr
    };
  });
  res.json(arr);
});

// Add / update product (base + default period)
app.post("/api/products", adminAuth, (req, res) => {
  const { id, name, price } = req.body || {};
  if (!id || !name || typeof price !== "number") {
    return res.status(400).json({ error: "missing_fields" });
  }
  const data = loadData();
  data.products[id] = data.products[id] || { id, keys: [], periods: {} };
  const prod = data.products[id];
  prod.name = name;
  prod.price = price;
  prod.periods = prod.periods || {};
  if (!prod.periods.default) {
    prod.periods.default = {
      id: "default",
      label: "Default",
      price,
      keys: []
    };
  } else {
    prod.periods.default.price = price;
  }
  saveData(data);
  res.json({ ok: true });
});

// Add / update period for product
app.post("/api/products/:id/periods", adminAuth, (req, res) => {
  const pid = req.params.id;
  const { periodId, label, price } = req.body || {};
  if (!periodId || !label || typeof price !== "number") {
    return res.status(400).json({ error: "missing_fields" });
  }

  const data = loadData();
  const prod = data.products[pid];
  if (!prod) return res.status(404).json({ error: "product_not_found" });

  prod.periods = prod.periods || {};
  const per = prod.periods[periodId] || { id: periodId, keys: [] };
  per.label = label;
  per.price = price;
  per.keys = per.keys || [];
  prod.periods[periodId] = per;

  saveData(data);
  res.json({ ok: true });
});

// Add keys to specific period
app.post("/api/products/:id/periods/:periodId/keys", adminAuth, (req, res) => {
  const pid = req.params.id;
  const periodId = req.params.periodId;
  const { keys } = req.body || {};
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: "keys_required" });
  }

  const data = loadData();
  const prod = data.products[pid];
  if (!prod) return res.status(404).json({ error: "product_not_found" });

  prod.periods = prod.periods || {};
  const per = prod.periods[periodId];
  if (!per) return res.status(404).json({ error: "period_not_found" });

  per.keys = per.keys || [];
  keys.forEach((k) => {
    per.keys.push({ value: k, used: false });
  });

  saveData(data);
  res.json({ ok: true, added: keys.length });
});

// Orders API
app.get("/api/orders/recent", adminAuth, (req, res) => {
  const data = loadData();
  const arr = Object.values(data.orders)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200);

  arr.forEach((o) => {
    const p = data.products[o.productId];
    if (p) o.productName = p.name;
    if (!o.periodLabel && o.periodId && p && p.periods && p.periods[o.periodId]) {
      o.periodLabel = p.periods[o.periodId].label;
    }
  });

  res.json(arr);
});

app.post("/api/orders/:invoice/accept", adminAuth, async (req, res) => {
  const invoice = parseInt(req.params.invoice, 10);
  const data = loadData();
  const order = data.orders[invoice];
  if (!order) return res.status(404).json({ error: "order_not_found" });
  if (order.status !== "pending")
    return res.status(400).json({ error: "invalid_status" });

  const product = data.products[order.productId];
  if (!product) return res.status(404).json({ error: "product_not_found" });

  const period = product.periods?.[order.periodId];
  if (!period) return res.status(404).json({ error: "period_not_found" });

  const availableKey = (period.keys || []).find((k) => !k.used);
  if (!availableKey) return res.status(400).json({ error: "no_keys" });

  availableKey.used = true;
  order.status = "completed";
  order.keyDelivered = availableKey.value;
  saveData(data);

  try {
    const buyer = await client.users.fetch(order.userId);
    await buyer.send(
      t(order.userId, "orderApproved") +
        `\n\`\`\`${availableKey.value}\`\`\``
    );
    await sendReviewRequest(buyer, order, product);
  } catch (e) {
    console.error("Failed to DM buyer on accept:", e);
  }

  res.json({ ok: true });
});

app.post("/api/orders/:invoice/reject", adminAuth, async (req, res) => {
  const invoice = parseInt(req.params.invoice, 10);
  const data = loadData();
  const order = data.orders[invoice];
  if (!order) return res.status(404).json({ error: "order_not_found" });

  order.status = "rejected";

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
    await buyer.send(t(order.userId, "orderRejected"));
  } catch (e) {
    console.error("Failed to DM buyer on reject:", e);
  }

  res.json({ ok: true });
});

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🌐 Dashboard listening on port ${PORT}`);
});

// Discord login
client.login(process.env.DISCORD_TOKEN);
