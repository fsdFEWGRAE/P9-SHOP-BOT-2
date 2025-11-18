# Discord Shop Bot

A fully-featured Discord shop bot with product management, multi-payment checkout, discount codes, and automated review system.

## Features

- **Product Management**: Add products and keys with unlimited stock
- **Interactive Buying**: Dropdown menus for product and payment selection
- **Multi-Payment Methods**: PayPal, STC Pay, Barq, Gift Card, Bank Transfer
- **Order Processing**: Invoice generation, payment proof submission, owner approval
- **Discount System**: Create and redeem discount codes with usage limits
- **Review System**: Automated 5-star rating with comments after order completion
- **Bilingual Support**: Arabic and English language options
- **Persistent Storage**: All data stored in `data.json`

## Setup Instructions

### 1. Discord Bot Configuration

Before running the bot, you must enable **Privileged Gateway Intents** in the Discord Developer Portal:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to the **Bot** section
4. Scroll down to **Privileged Gateway Intents**
5. Enable the following intents:
   - ✅ **MESSAGE CONTENT INTENT** (Required)
   - ✅ **SERVER MEMBERS INTENT** (Recommended)
6. Click **Save Changes**

### 2. Bot Permissions

When inviting the bot to your server, use this permission integer: `8` (Administrator) or include these specific permissions:
- Read Messages/View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- Use Slash Commands

### 3. Environment Variables

The following secrets are already configured in Replit:
- `DISCORD_TOKEN`: Your Discord bot token
- `OWNER_ID`: Your Discord user ID (for admin commands)

### 4. Review Channel

Make sure to update the review channel ID in `index.js` if needed:
```javascript
const REVIEW_CHANNEL_ID = '1438169825489719326';
```

## Commands

### Admin Commands (Owner Only)

- `!addproduct id | name | price` - Add a new product
- `!addkey productId | keyValue` - Add a key to a product
- `!adddiscount CODE | PERCENT | MAX_USES(optional)` - Create a discount code

### User Commands

- `!buy` - Start the buying process (shows product dropdown)
- `!discount CODE` - Redeem a discount code
- `!lang en` or `!lang ar` - Change language preference

## Usage Flow

1. **Owner adds products**: `!addproduct game1 | Cool Game | 50`
2. **Owner adds keys**: `!addkey game1 | XXXX-YYYY-ZZZZ`
3. **User buys**: `!buy` → Select product → Select payment method
4. **Bot sends invoice** to user's DM
5. **User sends payment proof** in DM
6. **Owner receives notification** with Accept/Reject buttons
7. **On approval**: Bot delivers key and requests review
8. **User rates** the purchase with 1-5 stars and optional comment
9. **Review posted** to review channel

## Data Storage

All data is stored in `data.json`:
- Products and their keys
- Orders and invoices
- Discount codes and redemptions
- User language preferences
- Customer reviews

## Running the Bot

The bot is configured to run automatically via the "Discord Bot" workflow. Simply restart the workflow after enabling the required intents in Discord Developer Portal.

## Support

For issues or questions, please ensure:
1. Bot token is valid
2. Privileged intents are enabled
3. Bot has proper permissions in your server
4. Review channel ID exists and bot can access it
