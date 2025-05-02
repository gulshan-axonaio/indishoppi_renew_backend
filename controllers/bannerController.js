const cloudinary = require("cloudinary").v2;

const formidable = require("formidable");
const bannerModel = require("../models/bannerModel.js");
const { responseReturn } = require("../utiles/response.js");

class bannerController {
  add_banner = async (req, res) => {
    const form = formidable();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        responseReturn(res, 404, { error: "something error" });
      } else {
        let { heading, subheading, btnText, clickUrl, bannerType } = fields;
        console.log(heading, subheading, btnText, clickUrl, bannerType);
        try {
          const cropParams = {
            gravity: "auto",
          };
          const { bannerImage } = files;
          if (bannerImage) {
            // Upload the cropped image to Cloudinary
            const result = await cloudinary.uploader.upload(
              bannerImage.filepath,
              {
                folder: "banners-indishopee",
                resource_type: "image",
                transformation: cropParams,
              }
            );

            if (result) {
              const banner = await bannerModel.create({
                heading,
                subheading,
                btnText,
                clickUrl,
                bannerType: bannerType ? bannerType : "carousel",
                imgUrl: result.url,
              });
              console.log(result);
              responseReturn(res, 201, {
                banner,
                status: 201,
                message: "Banner Created Successfully",
              });
            } else {
              console.log("image not found");
            }
          } else {
            responseReturn(res, 200, {
              message: "Image upload failed",
              status: 400,
            });
          }
        } catch (error) {
          console.log(error.message);
          responseReturn(res, 500, { error: "Internal server error" });
        }
      }
    });
  };

  get_banner_Items = async (req, res) => {
    try {
      const carousel_items = await bannerModel.find({ bannerType: "carousel" });

      const sectionOneAds = await bannerModel.find({
        bannerType: "sectionOne",
      });
      const sectionTwoAds = await bannerModel.find({
        bannerType: "sectionTwo",
      });
      const sectionThreeAds = await bannerModel.find({
        bannerType: "sectionThree",
      });
      const sectionFourAds = await bannerModel.find({
        bannerType: "sectionFour",
      });

      responseReturn(res, 200, {
        carousel_items,
        sectionFourAds,
        sectionThreeAds,
        sectionTwoAds,
        sectionOneAds,
        message: "items fetched successfully",
        status: 200,
      });
    } catch (error) {
      console.log(error, "errorData");

      responseReturn(res, 500, { error: "Internal server error" });
    }
  };

  deleteBanner = async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBanner = await bannerModel.findByIdAndDelete(id, {
        new: true,
      });
      responseReturn(res, 200, { bannerId: deletedBanner._id });
    } catch (error) {
      console.log(error.message, "errorData");

      responseReturn(res, 500, { error: "Internal server error" });
    }
  };
}
module.exports = new bannerController();
