
export default async function handler(req, res) {
  const LINE_CHANNEL_ID = "2012538750";
  const LINE_CHANNEL_SECRET="***";
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7IUlNUurymId31SmKg8cIEYNqHYaNk9J454MW2VvrHBGojApC87pqAbKBTkU44hJlFA/exec";

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

  async function queryOrder(name) {
    const url = GOOGLE_SCRIPT_URL + "?action=query&name=" + encodeURIComponent(name);
    const res = await fetch(url);
    const data = await res.json();
    return data;
  }

  if (req.method === "POST") {
    const events = req.body.events;
    if (!events) {
      res.status(200).json({ ok: true });
      return;
    }
    
    for (const event of events) {
      if (event.type === "follow") {
        const userId = event.source.userId;
        const token = await getLineToken();
        
        const msg = "👋 歡迎加入極引科技 LINE 官方帳號！\n\n" +
"📦 有訂單想查詢？\n" +
          "請發送「訂單查詢 + 姓名」\n" +
          "例：訂單查詢 小王\n\n" +
          "如有其他問題也歡迎直接訊息我們！";
        
        await sendLineMessage(token, userId, msg);
        res.status(200).json({ ok: true });
        return;
      }
      
      if (event.type === "message" && event.message.type === "text") {
        const userId = event.source.userId;
        const text = event.message.text;
        const token = await getLineToken();
        
        if (text.includes("訂單查詢") || text.includes("查詢訂單")) {
          const parts = text.split(" ");
          const name = parts.length > 1 ? parts.slice(1).join(" ") : "";
          
          if (!name) {
            await sendLineMessage(token, userId, "請告知您的姓名，例：訂單查詢 小王");
          } else {
            const result = await queryOrder(name);
            
            if (result.count === 0) {
              await sendLineMessage(token, userId, 
                "😢 找不到「" + name + "」的訂單\n\n" +
                "請確認姓名是否正確，或撥 0900235889（葉小姐）");
            } else {
              let reply = "📦 查找到 " + result.count + " 筆訂單：\n\n";
              result.orders.forEach((order, i) => {
                reply += "【訂單 " + (i+1) + "】\n";
                reply += "時間：" + order.timestamp + "\n";
                reply += "產品：" + order.productName + "\n";
                reply += "編號：" + order.code + "\n";
                reply += "數量：" + order.qty + "\n";
                reply += "單價：" + (order.price ? "$" + order.price : "—") + "\n";
                if (order.address) reply += "送貨地址：" + order.address + "\n";
                reply += "\n";
              });
              reply += "如有任何問題請直接回覆此訊息。\n感謝您的訂購！";
              
              await sendLineMessage(token, userId, reply);
            }
          }
          
          res.status(200).json({ ok: true });
          return;
        }
        
        const defaultMsg = "感謝您的訊息！\n極引科技會盡快回覆您。\n\n" +
          "📦 查詢訂單：發送「訂單查詢 + 姓名」\n" +
          "📞 電話：0900235889（葉小姐）";
        await sendLineMessage(token, userId, defaultMsg);
        res.status(200).json({ ok: true });
        return;
      }
    }
  }
  
  res.status(200).json({ status: "ok", service: "PLT LINE Webhook" });
}
