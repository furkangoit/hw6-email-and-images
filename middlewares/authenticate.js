import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import { User } from "../models/user.js";

const { JWT_SECRET } = process.env;

const authenticate = async (req, res, next) => {
  const { authorization = "" } = req.headers;
  const [bearer, token] = authorization.split(" ");

  if (bearer !== "Bearer" || !token) {
    return next(createHttpError(401, "Not authorized"));
  }

  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(id);

    if (!user || !user.token || user.token !== token) {
      return next(createHttpError(401, "Not authorized"));
    }
    req.user = user;
    next();
  } catch (error) {
    next(createHttpError(401, "Not authorized"));
  }
};

export default authenticate;
