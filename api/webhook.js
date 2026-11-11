const LINE_CHANNEL_ID = "2012538750";
const LINE_CHANNEL_SECRET="ac364e...8b16";

async function getLineToken() {
  const res = await fetch("https://api.line.me/oauth/v2/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "client_id=" + LINE_CHANNEL_ID + "&client_secret=" + LINE_CHANNEL_SECRET + "&grant_type=client_credentials"
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get LINE token");
  return data.access_token;
}

async function sendLineMessage(token, userId, text) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: text }]
    })
  });
  return await res.json();
}

exports.api = async (req, res) => {
  if (req.method === "POST") {
    const events = req.body.events;
    if (events) {
      for (const event of events) {
        if (event.type === "message" || event.type === "follow") {
          const userId = event.source.userId;
          const token = await getLineToken();
          
          const msg = "🛒 極引科技已收到您的訂單\n\n" +
            "訂單內容將由專人為您確認\n" +
            "如有任何問題請直接回覆此訊息\n" +
            "感謝您的訂購！";
          
          await sendLineMessage(token, userId, msg);
          res.status(200).json({ ok: true });
          return;
        }
      }
    }
  }
  
  res.status(200).json({ status: "ok", service: "PLT LINE Webhook" });
};
