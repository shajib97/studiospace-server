const jwt = require("jsonwebtoken");

const secret = process.env.API_JWT_SECRET;

if (!secret) {
  throw new Error("API_JWT_SECRET must be set in .env");
}

function verifyJWT(req, res, next) {
  const token = req.cookies.studiospace_api_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "studiospace-auth",
      audience: "studiospace-api",
      maxAge: "5m",
    });

    const userId = decoded.sub;
    const expiresAt = decoded.exp;

    if (typeof userId !== "string" || !userId) {
      throw new Error("Missing user ID");
    }

    if (typeof expiresAt !== "number") {
      throw new Error("Missing expiration");
    }
    req.auth = { userId };
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your login token is invalid or expired.",
    });
  }
  next();
}
module.exports = verifyJWT;
