import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
})) 

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public")) //saving file and folder and making public assets where people can access files(folder name can be any , here we have kept name as public)
app.use(cookieParser()) //used for accessing and setting cokkies in users browser

//routes import
import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users", userRouter)  // http://localhost:8000//api/v1/users/register

export {app}