class ValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function fail(message, statusCode = 400) {
  throw new ValidationError(message, statusCode);
}

function ensureOnlyFields(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    fail("Request body must be a JSON object.");
  }

  const unsupported = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (unsupported.length > 0) {
    fail(`Unsupported field${unsupported.length > 1 ? "s" : ""}: ${unsupported.join(", ")}.`);
  }
}

function requiredText(value, label, { min = 1, max = 255 } = {}) {
  if (typeof value !== "string") {
    fail(`${label} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length < min) {
    fail(`${label} must be at least ${min} character${min === 1 ? "" : "s"} long.`);
  }
  if (normalized.length > max) {
    fail(`${label} must be at most ${max} characters long.`);
  }
  return normalized;
}

function optionalText(value, label, { max = 255, allowNull = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null && allowNull) return null;
  if (typeof value !== "string") {
    fail(`${label} must be text.`);
  }

  const normalized = value.trim();
  if (normalized.length > max) {
    fail(`${label} must be at most ${max} characters long.`);
  }
  return normalized || null;
}

function parsePositiveId(value, label = "ID") {
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseOptionalId(value, label = "ID") {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveId(value, label);
}

function parsePositiveInteger(value, label, { defaultValue, max = 10000 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (defaultValue !== undefined) return defaultValue;
    fail(`${label} is required.`);
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    fail(`${label} must be a whole number between 1 and ${max}.`);
  }
  return parsed;
}

function parsePositivePrice(value, label = "Price") {
  if (value === undefined || value === null || value === "") {
    fail(`${label} is required.`);
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 99999999.99) {
    fail(`${label} must be a positive amount no greater than 99,999,999.99.`);
  }
  if (Math.abs(Math.round(parsed * 100) - parsed * 100) > 1e-8) {
    fail(`${label} can have no more than two decimal places.`);
  }
  return parsed;
}

function parseCoordinate(value, label, min, max) {
  if (value === undefined || value === null || value === "") {
    fail(`${label} is required.`);
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fail(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function parseRadius(value, defaultValue = 3, { min = 0.1, max = 50 } = {}) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    fail(`Radius must be between ${min} and ${max} km.`);
  }
  return parsed;
}

function parseTime(value, label) {
  if (typeof value !== "string") {
    fail(`${label} must use HH:MM or HH:MM:SS format.`);
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    fail(`${label} must use HH:MM or HH:MM:SS format.`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || "0");
  if (hours > 23 || minutes > 59 || seconds > 59) {
    fail(`${label} is not a valid time.`);
  }
  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, "0")}`;
}

function timeToSeconds(value) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function parseBoolean(value, label = "Value") {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`${label} must be true or false.`);
}

function normalizeEmail(value) {
  const email = requiredText(value, "Email", { min: 3, max: 150 }).toLowerCase();
  // This intentionally keeps validation pragmatic while rejecting malformed input.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail("Email must be a valid email address.");
  }
  return email;
}

function normalizePhone(value, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) fail("Phone number is required.");
    return null;
  }
  if (typeof value !== "string") {
    fail("Phone number must be text.");
  }

  const phone = value.trim();
  if (!/^\+?[0-9()\-\s]{7,15}$/.test(phone)) {
    fail("Phone number must contain 7 to 15 digits or phone characters.");
  }
  return phone;
}

function normalizePassword(value, label = "Password") {
  if (typeof value !== "string") {
    fail(`${label} is required.`);
  }
  if (value.length < 8 || value.length > 72) {
    fail(`${label} must be between 8 and 72 characters long.`);
  }
  return value;
}

function respondWithError(res, err, fallbackMessage, logLabel) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error(logLabel, err);
  return res.status(500).json({ message: fallbackMessage });
}

module.exports = {
  ValidationError,
  hasOwn,
  ensureOnlyFields,
  requiredText,
  optionalText,
  parsePositiveId,
  parseOptionalId,
  parsePositiveInteger,
  parsePositivePrice,
  parseCoordinate,
  parseRadius,
  parseTime,
  timeToSeconds,
  parseBoolean,
  normalizeEmail,
  normalizePhone,
  normalizePassword,
  respondWithError,
};
