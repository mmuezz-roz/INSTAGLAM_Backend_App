import jwt from "jsonwebtoken";

const Verifytoken = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }
  const tokens = token.split(" ")[1];

  try {
    const decoded = jwt.verify(tokens, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next()
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default Verifytoken;