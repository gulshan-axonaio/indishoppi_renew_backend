const { Schema, model } = require("mongoose");

const recentSearchSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "customers", // Reference to the User model
      required: true,
    },
    searches: [
      {
        searchTerm: { type: String, required: true }, // The search term
        image: { type: String, required: false }, // Optional image URL
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("RecentSearch", recentSearchSchema);
