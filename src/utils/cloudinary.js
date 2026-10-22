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

const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return null;

    // Split URL by '/upload/' to isolate everything after it
    // Example target string: "v1710000000/folder/avatar_name.jpg"
    const urlParts = imageUrl.split("/upload/");
    if (urlParts.length < 2) return null;

    // Split the remaining string by '/' to skip the version tag (e.g. 'v1710000000')
    // then rejoin the remaining array fragments and strip the file extension (.jpg/.png etc)
    const remainingParts = urlParts[1].split("/");
    remainingParts.shift(); //removes 'v1710000000'

    const publicIdWithExtension = remainingParts.join("/"); // returns 'folder/avatar_name.jpg' or 'avatar_name.jpg'
    const publicId = publicIdWithExtension.split(".").slice(0, -1).join("."); // removes extension cleanly -> 'avatar_name'

    if (!publicId) return null;

    // Delete the image asset from Cloudinary storage
    const response = await cloudinary.uploader.destroy(publicId);
    console.log(
      `File deleted from Cloudinary. Public ID: ${publicId}`,
      response
    );
    return response;
  } catch (error) {
    console.error("Error while deleting asset from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
