const { Schema, model } = require("mongoose");

const BannerSchema = new Schema(
  {
    heading: {
      type: String,
      required: true,
    },
    subheading: {
      type: String,
      required: true,
    },
    imgUrl: {
      type: String,
      required: true,
    },
    btnText: {
      type: String,
      required: true,
    },
    bannerType: {
      type: String,
      enum: [
        "carousel",
        "sectionOne",
        "sectionTwo",
        "sectionThree",
        "sectionFour",
      ],
      default: "carousel",
    },
    clickUrl: {
      type: String,
      requried: true,
    },
  },
  { timestamps: true }
);

module.exports = model("banner", BannerSchema);
