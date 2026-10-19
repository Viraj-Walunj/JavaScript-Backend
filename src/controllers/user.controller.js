import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

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
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    //2.verification
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    //3.database validation
    const user = await User.findById(decodedToken?._id)
  
    if (!user){
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    //4.token rotation
    const option ={
      httpOnly:true,
      secure:true
    }
  
    //5.final response
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    return res.status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
