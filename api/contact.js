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

  // Keep form submission successful even if webhook forwarding fails.
  if (process.env.CONTACT_WEBHOOK_URL && typeof fetch === "function") {
    try {
      var webhookResponse = await fetch(process.env.CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!webhookResponse.ok) {
        console.warn("[contact:webhook] non-2xx response", webhookResponse.status);
      }
    } catch (error) {
      console.warn("[contact:webhook] delivery failed", error && error.message ? error.message : error);
    }
  }

  console.log("[contact]", JSON.stringify(payload));
  return json(res, 200, { ok: true, trackingId: trackingId });
};
