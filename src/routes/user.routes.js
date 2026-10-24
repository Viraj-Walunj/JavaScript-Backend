import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory,
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

//register route
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

//login route
router.route("/login").post(loginUser)

//logout route (secured routes)
router.route("/logout").post(verifyJWT, logoutUser) // Control flows through `verifyJWT` (to authenticate and inject the user context) before executing `logoutUser`.

//refreshAccessToken endpoint (secured routes)
router.route("/refresh-token").post(refreshAccessToken)

//change password route (secured routes)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)

//current user retrieval route (secured routes)
router.route("/current-user").get(verifyJWT, getCurrentUser)

//Account details updates route (secured routes)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

// file upload route (secured routes)
// (Avatar)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
// file upload route (secured routes)
// (coverImage)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

// getUserChannelProfile route (secured routes)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)

// getWatchHistory routes (secured routes)
router.route("/history").get(verifyJWT, getWatchHistory)


export default router