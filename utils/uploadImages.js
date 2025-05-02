import cloudinary from "cloudinary";

export async function uploadImages(foldername, files) {
  const uploadResponses = await Promise.all(
    files.map(async (file) => {
      const response = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: foldername,
      });
      if (response.error) {
        throw new Error(response.error.message || "Unknown Cloudinary error");
      }
      return {
        public_id: response.public_id,
        url: response.secure_url,
      };
    })
  );
  return uploadResponses;
}
export async function uploadImage(foldername, file) {
  const uploadResponses = await cloudinary.uploader.upload(file.tempFilePath, {
    folder: foldername,
  });

  return uploadResponses;
}
