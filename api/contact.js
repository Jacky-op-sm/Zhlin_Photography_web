function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function parseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === "object") return rawBody;

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return null;
  }
}

function sanitize(input) {
  return String(input || "").trim();
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

  var body = parseBody(req.body);
  if (!body) {
    return json(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  var firstName = sanitize(body.firstName);
  var lastName = sanitize(body.lastName);
  var email = sanitize(body.email);
  var type = sanitize(body.type);
  var message = sanitize(body.message);
  var website = sanitize(body.website);

  // Honeypot field: silently accept to avoid bot retries.
  if (website) {
    return json(res, 200, { ok: true, trackingId: "bot-filtered" });
  }

  if (!firstName || !lastName || !email || !type || !message) {
    return json(res, 400, { ok: false, error: "Missing required fields" });
  }

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return json(res, 400, { ok: false, error: "Invalid email" });
  }

  var trackingId = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  var payload = {
    trackingId: trackingId,
    firstName: firstName,
    lastName: lastName,
    email: email,
    type: type,
    message: message,
    receivedAt: new Date().toISOString()
  };

  try {
    if (process.env.CONTACT_WEBHOOK_URL && typeof fetch === "function") {
      await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    }

    console.log("[contact]", JSON.stringify(payload));
    return json(res, 200, { ok: true, trackingId: trackingId });
  } catch (error) {
    console.error("[contact:error]", error);
    return json(res, 500, { ok: false, error: "Failed to deliver message" });
  }
};
