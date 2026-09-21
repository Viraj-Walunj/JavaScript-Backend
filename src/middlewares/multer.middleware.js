// Import the multer library, which is a middleware used for handling multipart/form-data (primarily for uploading files).
import multer from "multer";

// Configure the disk storage engine to control where and how files are saved on the server.
const storage = multer.diskStorage({
    // Define the destination folder where the uploaded files will be stored.
    destination: function (req, file, cb){
        // Call the callback (cb) with 'null' for no errors, and the folder path "./public/temp" as the destination.
        cb(null, "./public/temp")
    },
    // Define the filename configuration to determine what the file should be named inside the folder.
    filename: function (req, file, cb){
        // Call the callback (cb) with 'null' for no errors, saving the file with its original uploaded name.
        cb(null, file.originalname)
    }
})

// Initialize the multer instance with our custom storage configuration and export it for use in routes.
export const upload = multer({
    storage, // Short-hand for 'storage: storage' in ES6
})
