// require ('dotenv').config({path: './env'})

// OR(now in the current version not needed to add this)

//using experimental import for code modularity(but not work until you use this in package.json
// "scripts": {
//     "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js"
//   },
// )
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGODB connnecion failed !!!", err);
})










/*
import mongoose from "monngoose";
import { DB_NAME } from "./constants";

// Approach 1
import express from "express"
const app = express()

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on("error", (error)=>{
            console.log("ERROR: ", error);
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    }
    catch (error){
        console.log("ERROR: ", error)
        throw error
    }
})
*/
