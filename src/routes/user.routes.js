import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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


export default router