function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function parseUrlEncoded(input) {
  var result = {};
  var text = String(input || "");
  if (!text) return result;

  var pairs = text.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    if (!pair) continue;
    var eqIndex = pair.indexOf("=");
    var rawKey = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair;
    var rawValue = eqIndex >= 0 ? pair.slice(eqIndex + 1) : "";
    var key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    var value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    result[key] = value;
  }
  return result;
}

function parseBody(rawBody, contentType) {
  if (!rawBody) return {};
  if (typeof rawBody === "object") return rawBody;

  var text = String(rawBody || "");
  if (!text) return {};

  var type = String(contentType || "").toLowerCase();
  if (type.indexOf("application/x-www-form-urlencoded") >= 0) {
    return parseUrlEncoded(text);
  }

  if (type.indexOf("application/json") >= 0) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  // Fallback: try JSON first, then URL encoded.
  try {
    return JSON.parse(text);
  } catch (error) {
    return parseUrlEncoded(text);
  }
}

function getHeader(req, name) {
  if (!req || !req.headers) return "";
  var key = String(name || "").toLowerCase();
  return req.headers[key] || "";
}

function readRequestBody(req) {
  return new Promise(function (resolve, reject) {
    if (!req || typeof req.on !== "function") {
      resolve("");
      return;
    }

    var chunks = [];
    req.on("data", function (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", function (error) {
      reject(error);
    });
  });
}

function sanitize(input) {
  return String(input || "").trim();
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeError(error) {
  if (!error) return "unknown error";
  if (typeof error === "string") return error;
  return error.message || String(error);
}

async function deliverToWebhook(payload) {
  if (!process.env.CONTACT_WEBHOOK_URL || typeof fetch !== "function") {
    return { delivered: false, skipped: true, channel: "webhook" };
  }

  var response = await fetch(process.env.CONTACT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("webhook returned " + response.status);
  }

  return { delivered: true, channel: "webhook" };
}

async function deliverToResend(payload) {
  var apiKey = sanitize(process.env.RESEND_API_KEY);
  var fromEmail = sanitize(process.env.CONTACT_FROM_EMAIL);
  var toEmail = sanitize(process.env.CONTACT_TO_EMAIL);
  if (!apiKey || !fromEmail || !toEmail || typeof fetch !== "function") {
    return { delivered: false, skipped: true, channel: "resend" };
  }

  var subject = "[Website Contact] " + payload.type + " · " + payload.firstName + " " + payload.lastName;
  var html = [
    "<p><strong>Tracking ID:</strong> " + escapeHtml(payload.trackingId) + "</p>",
    "<p><strong>Time:</strong> " + escapeHtml(payload.receivedAt) + "</p>",
    "<p><strong>Name:</strong> " + escapeHtml(payload.firstName + " " + payload.lastName) + "</p>",
    "<p><strong>Email:</strong> " + escapeHtml(payload.email) + "</p>",
    "<p><strong>Type:</strong> " + escapeHtml(payload.type) + "</p>",
    "<p><strong>Message:</strong></p>",
    "<p>" + escapeHtml(payload.message).replace(/\n/g, "<br>") + "</p>"
  ].join("");
  var text =
    "Tracking ID: " + payload.trackingId + "\n" +
    "Time: " + payload.receivedAt + "\n" +
    "Name: " + payload.firstName + " " + payload.lastName + "\n" +
    "Email: " + payload.email + "\n" +
    "Type: " + payload.type + "\n\n" +
    payload.message;

  var response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: payload.email,
      subject: subject,
      html: html,
      text: text
    })
  });

  var responseBody = null;
  var raw = await response.text();
  if (raw) {
    try {
      responseBody = JSON.parse(raw);
    } catch (error) {
      responseBody = null;
    }
  }

  if (!response.ok) {
    throw new Error("resend returned " + response.status + (raw ? " " + raw.slice(0, 200) : ""));
  }

  return {
    delivered: true,
    channel: "resend",
    messageId: responseBody && responseBody.id ? String(responseBody.id) : ""
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  var contentType = getHeader(req, "content-type");
  var rawBody = req.body;
  if (!rawBody) {
    rawBody = await readRequestBody(req);
  }

  var body = parseBody(rawBody, contentType);
  if (!body) {
    return json(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  // Accept both camelCase and snake_case for compatibility.
  var firstName = sanitize(body.firstName || body.first_name);
  var lastName = sanitize(body.lastName || body.last_name);
  var email = sanitize(body.email);
  var type = sanitize(body.type);
  var message = sanitize(body.message);
  var website = sanitize(body.website);

  // Honeypot field: reject suspicious submissions.
  if (website) {
    return json(res, 400, { ok: false, error: "Spam check failed" });
  }

  if (!firstName || !lastName || !email || !type || !message) {
    return json(res, 400, { ok: false, error: "Missing required fields" });
  }

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json(res, 400, { ok: false, error: "Invalid email" });
  }

  var trackingId = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  var hasWebhook = !!sanitize(process.env.CONTACT_WEBHOOK_URL);
  var hasResend = !!sanitize(process.env.RESEND_API_KEY) &&
    !!sanitize(process.env.CONTACT_FROM_EMAIL) &&
    !!sanitize(process.env.CONTACT_TO_EMAIL);

  if (!hasWebhook && !hasResend) {
    console.error("[contact] no delivery channel configured", trackingId);
    return json(res, 500, {
      ok: false,
      error: "联系通道未配置，请联系站长设置发送服务后重试。",
      trackingId: trackingId
    });
  }

  var payload = {
    trackingId: trackingId,
    firstName: firstName,
    lastName: lastName,
    email: email,
    type: type,
    message: message,
    receivedAt: new Date().toISOString()
  };

  var deliveries = [];
  var errors = [];

  try {
    var webhookResult = await deliverToWebhook(payload);
    if (webhookResult.delivered) deliveries.push(webhookResult.channel);
  } catch (error) {
    errors.push("webhook: " + serializeError(error));
  }

  try {
    var resendResult = await deliverToResend(payload);
    if (resendResult.delivered) {
      deliveries.push(resendResult.channel + (resendResult.messageId ? ":" + resendResult.messageId : ""));
    }
  } catch (error) {
    errors.push("resend: " + serializeError(error));
  }

  if (!deliveries.length) {
    console.error("[contact] delivery failed", JSON.stringify({ trackingId: trackingId, errors: errors }));
    return json(res, 502, {
      ok: false,
      error: "消息未送达，请稍后重试或直接邮件联系站长。",
      trackingId: trackingId
    });
  }

  console.log("[contact] delivered", JSON.stringify({ trackingId: trackingId, channels: deliveries }));
  return json(res, 200, { ok: true, trackingId: trackingId, deliveredVia: deliveries });
};
