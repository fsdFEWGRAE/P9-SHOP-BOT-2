const http = require("http");

setInterval(() => {
  console.log("⏳ KeepAlive Ping");
}, 150000);

// سيرفر صغير يخلي Replit ما يوقف التطبيق
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive\n");
  })
  .listen(3000, () => {
    console.log("🌐 KeepAlive server running on port 3000");
  });
