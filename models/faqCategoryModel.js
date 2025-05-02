const { Schema, model } = require("mongoose");

const faqCategorySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
    },
  },
  { timestamps: true }
);

faqCategorySchema.index({
  title: "text",
});

module.exports = model("faqCategory", faqCategorySchema);
