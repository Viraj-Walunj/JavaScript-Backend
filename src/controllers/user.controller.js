import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js" 
import {User} from "../models/user.model.js" 
import { uploadOnCloudinary } from "../utils/cloudinary.js";  
import { ApiResponse } from "../utils/ApiResponse.js";  

const registerUser = asyncHandler(async (req, res) => {
   
    // 1. Get user details
    const {fullName, email, username, password} = req.body     
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
      [fullName, email, username, password].some((field) => field?.trim() === "" )
    ){
      throw new ApiError (400, "All fields are required")
    }    

    //3. Check user already exist
    const existedUser = User.findOne({
      $or: [{username}, {email}]
    }) 
    if(existedUser){
      throw new ApiError(409, "User with email or username already exists")
    }

    //4.handle files check for image, check for avatar( added middleware before registerUser in user.routes.js)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //checking for avatar(compulsory)
    if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is required")
    }

    //5.Upload on cloud(cloudinary)
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary (coverImageLocalPath)
    //checking for avatar(compulsory)
    if(!avatar ){
      throw new ApiError(400, "Avatar file is required")
    }

    //6. Create database entry
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
    })
    
    //7. Clean response(exclude password and refreshToken)
    const createdUser = await User.findById(user._id).select(
      //here we have to write fields which we don't want (by default all fields are selected, means in wanted)
        "-password -refreshToken"
    )
    //check the user is created or empty
    if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering the user")
    }

    //8. Verify and respond
    return res.status(201).json(
      new ApiResponse(200, createdUser, "User registered Successfully")
    )

});

export { registerUser };
 