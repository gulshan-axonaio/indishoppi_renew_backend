const { Schema, model, models } = require("mongoose");
const filteroptionModel = require("./filteroptionModel");

async function createDynamicVariantSchema() {
  const baseSchemaDefinition = {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },
    sellerId: {
      type: Schema.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    category: { type: Schema.Types.ObjectId, ref: "categorys" },
    subcategory: { type: Schema.Types.ObjectId, ref: "Subcategory" },
    brand: { type: String, required: true },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
    },
    discountedPrice: {
      type: Number,
    },
    stock: {
      type: Number,
      required: true,
      default: 1,
    },
    featured: { type: Number, default: 0 },
    description: {
      type: String,
      required: true,
    },
    shopName: { type: String, required: true },
    images: {
      type: [String],
      required: true,
    },
    rating: { type: Number, default: 0 },
    sponsors: [{ type: Schema.ObjectId, ref: "products" }],
    free_delivery: { type: String, default: "free" },
    returnPolicy: { type: String, default: "7 days" },
    type: {
      type: String,
      required: true,
    },
    colorCode: { type: String, default: null },
    color: { type: String, default: null },
    views: { type: Number, default: 0 },
  };

  // Fetch dynamic filter options
  const fields = await filteroptionModel.find({});
  let allOptions = [];

  fields.forEach((field) => {
    if (field.options && field.options.length > 0) {
      allOptions = [...allOptions, ...field.options];
    }
  });

  const uniqueOptions = [...new Set(allOptions)];

  // Add dynamic fields
  uniqueOptions.forEach((option) => {
    baseSchemaDefinition[option] = {
      type: String,
      default: "",
    };
  });

  const variantSchema = new Schema(baseSchemaDefinition, { timestamps: true });

  return models.variants || model("variants", variantSchema);
}

module.exports = createDynamicVariantSchema;
