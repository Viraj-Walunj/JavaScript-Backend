import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Access and refresh token (Login Implementation)
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating refresh and access token"
    );
  }
};

//Register Implementation
const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details
  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  // 2. Validate input

  /*
    if (fullName === ""){
      throw new ApiError(400, "fullname is required")
    }
      .
      .
      .
    */

  // OR

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3. Check user already exist
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  console.log(req.files);

  //4.handle files check for image, check for avatar( added middleware before registerUser in user.routes.js)
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // OR

  // let coverImageLocalPath;
  // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
  //   coverImageLocalPath = req.files.coverImage[0].path
  // }

  //checking for avatar(compulsory)
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //5.Upload on cloud(cloudinary)
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //checking for avatar(compulsory)
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //6. Create database entry
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //7. Clean response(exclude password and refreshToken)
  const createdUser = await User.findById(user._id).select(
    //here we have to write fields which we don't want (by default all fields are selected, means in wanted)
    "-password -refreshToken"
  );
  //check the user is created or empty
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //8. Verify and respond
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

//Login Implementation
const loginUser = asyncHandler(async (req, res) => {
  // req body -> data

  const { email, username, password } = req.body;

  // username or email
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  // (optional)
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookies
  const options = {
    httpOnly: true, //only modifiable through server
    secure: true, //only modifiable through server
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken }, //data
        "User Logged In Successfully" //message sending to user
      )
    );
});

//Logout Implementation
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    // Uses the MongoDB `$set` operator to remove or invalidate the user's stored refresh token.
    // Setting it to `undefined` effectively deletes the key from the document or clears its value.
    { $set: { refreshToken: undefined } },
    { new: true } //for new updated value
    //  { returnDocument: 'after' } //new instead of { new: true } as it is depricated
  );

  const options = {
    httpOnly: true,
    secure: true,
    // secure: process.env.NODE_ENV === "production"
  };

  return (
    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      // Passes a 200 code, an empty object `{}` as data since the user is leaving, and a success message string.
      .json(new ApiResponse(200, {}, "User logged Out"))
  );
});

//refreshAccessToken controller for endpoint
//1.Extracting the refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    //2.verification
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //3.database validation
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    //4.token rotation
    const option = {
      httpOnly: true,
      secure: true,
    };

    //5.final response
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//User password management
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Extracts the old and new passwords from the incoming HTTP request body
  const { oldPassword, newPassword } = req.body;

  // Queries the database to find the user document using the ID attached by the auth middleware
  const user = await User.findById(req.user?._id);
  // compare the provided old password with the hashed password in the DB
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // Updates the user object's password property in memory with the new password
  user.password = newPassword;
  // Saves the updated user document to MongoDB, bypassing other schema validation rules to save resources
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//Current user retrieval
const getCurrentUser = asyncHandler(async (req, res) => {
  return (
    res
      .status(200)
      // req.user is used here as the data payload sent back to the client(because it holds the identity of the currently logged-in user who made the API request)
      .json(new ApiResponse(200, req.user, "current user fetched successfully"))
  );
});

//Account details updates
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },

    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//File upload(Avatar & Cover Image)
//Avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  // Extracts the local file system path of the uploaded avatar file added by file middleware (like Multer)
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //Fetch current user data to find the old avatar URL
  const currentUser = await User.findById(req.user?._id);
  const oldAvatarUrl = currentUser?.avatar;

  // Uploads the local file onto Cloudinary and waits for the cloud storage response object
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  // Updates the authenticated user's profile in the database with the new cloud storage asset URL
  const user = await User.findByIdAndUpdate(
    req.user?._id, // Uses the logged-in user's unique ID injected by auth middleware
    {
      $set: {
        avatar: avatar.url,
      },
    },

    { new: true } // Instructs Mongoose to return the freshly modified document instead of the stale original
  ).select("-password");

  //delete the old image from cloudinary if exist (Done after DB update succeeds)
  if (oldAvatarUrl) {
    await deleteFromCloudinary(oldAvatarUrl);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

//Cover Image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Extracts the local file system path of the uploaded avatar file added by file middleware (like Multer)
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  // Fetch current user data to find the old cover image URL
  const currentUser = await User.findById(req.user?._id);
  const oldCoverImageUrl = currentUser?.coverImage;

  // Uploads the local file onto Cloudinary and waits for the cloud storage response object
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }

  // Updates the authenticated user's profile in the database with the new cloud storage asset URL
  const user = await User.findByIdAndUpdate(
    req.user?._id, // Uses the logged-in user's unique ID injected by auth middleware
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true } // Instructs Mongoose to return the freshly modified document instead of the stale original
  ).select("-password");

  if (oldCoverImageUrl) {
    await deleteFromCloudinary(oldCoverImageUrl);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

//Mongodb aggregation pipeline
// (A controller function to fetch a specific user's public channel profile details)
const getUserChannelProfile = asyncHandler(async (req, res) => {
  // Destructure and extract the 'username' variable from the URL request parameters (e.g., /api/v1/users/:username)
  const { username } = req.params;

  // .trim checks just an empty text block after removing whitespaces
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // Execute a MongoDB Aggregation Pipeline on the User collection to build a combined/computed profile document
  const channel = await User.aggregate([
    {
      // $=field
      // STAGE 1: Filter the User collection to look for a matching profile
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // STAGE 2: Perform a left outer join with the 'subscriptions' collection to discover who follows this user
      //Refer subscription schema diagram for this
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // STAGE 3: Perform another left outer join to see who this specific user is following
      //Refer subscription schema diagram for this
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // STAGE 4: Append dynamic computed fields to the document without wiping out existing fields
      $addFields: {
        subscribersCount: {
          // $size is used to count/calculate documents
          $size: "$subscribers",
        },
        channelsSubscribedToCounts: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            // $in is used to find present or not , it also sees in arrays and also in objects
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true, // IF the logged-in user's ID is present in that list, return true
            else: false, // OTHERWISE, return false
          },
        },
      },
    },
    {
      // STAGE 5: Shape the final object output format by filtering specific document keys
      // $project = gives selected items only
      $project: {
        // 1 = means flag is on and this value is passed now
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCounts: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  // Check if the aggregation pipeline returned an empty array, meaning no user matched the username filter
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res.status(200).json(
    // (extracted from index 0 of the array)
    new ApiResponse(200, channel[0], "User channel fetched successfully")
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
