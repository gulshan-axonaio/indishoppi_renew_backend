const { Schema, model } = require("mongoose");

const featuredCategorys = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    categorys: [{ type: String, required: true }],
    subcategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Subcategory",
      },
    ],
    image: {
      type: String,
      // required: true
    },
    slug: {
      type: String,
      // required: true
    },
  },
  { timestamps: true }
);

featuredCategorys.index({
  slug: "text",
});

module.exports = model("featuredCategorys", featuredCategorys);
