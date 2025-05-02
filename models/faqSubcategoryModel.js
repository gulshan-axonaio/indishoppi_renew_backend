const { Schema, model } = require("mongoose");

const faqSubcategorySchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "faqCategory",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

faqSubcategorySchema.index({
  title: "text",
});

module.exports = model("faqSubcategory", faqSubcategorySchema);
