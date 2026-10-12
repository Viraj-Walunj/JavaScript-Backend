import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Ex:
    /*
       .upload(
           'https://res.cloudinary.com/demo/image/u pload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
        */

    //1.file has been uploaded successfully
    console.log("file is uploaded on cloudinary ", response.url);
    // Success Cleanup:
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  } catch (error) {
    //  2. Cloudinary upload error
    console.error("Cloudinary upload error details:", error);
    //remove the locally saved temporary file as the upload operation got failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export { uploadOnCloudinary };
