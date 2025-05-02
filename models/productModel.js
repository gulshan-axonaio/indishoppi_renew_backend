const { Schema, model, models } = require("mongoose");
const filteroptionModel = require("./filteroptionModel");

async function createDynamicProductSchema() {
  const baseSchemaDefinition = {
    sellerId: { type: Schema.ObjectId, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "categorys" },
    subcategory: { type: Schema.Types.ObjectId, ref: "Subcategory" },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, required: true },
    discountedPrice: { type: Number },
    stock: { type: Number, default: 1, required: true },
    featured: { type: Number, default: 0 },
    description: { type: String, required: true },
    shopName: { type: String, required: true },
    images: { type: Array, required: true },
    rating: { type: Number, default: 0 },
    sponsors: [{ type: Schema.ObjectId, ref: "products" }],
    free_delivery: { type: String, default: "free" },
    returnPolicy: { type: String, default: "7 days" },
    type: { type: String, required: true },
    colorCode: { type: String, default: null },
    color: { type: String, default: null },
    views: { type: Number, default: 0 },
    variations: [{ type: Schema.Types.ObjectId, ref: "variants" }],
  };

  // Get unique options from filteroptionModel
  const fields = await filteroptionModel.find({});
  let allOptions = [];

  fields.forEach((field) => {
    if (field.options && field.options.length > 0) {
      allOptions = [...allOptions, ...field.options];
    }
  });

  const uniqueOptions = [...new Set(allOptions)];

  uniqueOptions.forEach((option) => {
    if (!baseSchemaDefinition.hasOwnProperty(option)) {
      baseSchemaDefinition[option] = { type: String, default: "" };
    }
  });

  const productSchema = new Schema(baseSchemaDefinition, { timestamps: true });

  productSchema.index(
    {
      name: "text",
      category: "text",
      brand: "text",
    },
    {
      weights: {
        name: 5,
        category: 4,
        brand: 3,
        description: 2,
      },
    }
  );

  return models.products || model("products", productSchema);
}

module.exports = createDynamicProductSchema;
