const { Schema, model } = require("mongoose");

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
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

categorySchema.index({
  name: "text",
});

module.exports = model("categorys", categorySchema);
