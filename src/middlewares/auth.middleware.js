import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

//`next` (callback to pass control to the next middleware).
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Attempts to extract the token by checking the browser cookies (`req.cookies`) first.
    // If cookies aren't present, it falls back to parsing the standard HTTP `Authorization` request header.
    // Uses the `.replace()` string method to clean up the header payload by stripping away the "Bearer " prefix string.
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // Queries the MongoDB database using Mongoose to look up the user by their unique database ID extracted from the decoded token payload.
    // Excludes highly sensitive variables like the hashed user password and active session refresh token from the query output.
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Appends the sanitized database user record directly onto the incoming Express request object (`req.user`).
    // This makes user data globally accessible within any downstream route handlers (like the logout controller).
    req.user = user;
    next(); // Signals Express that the current middleware operation completed successfully and triggers the next step in the request lifecycle.
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
