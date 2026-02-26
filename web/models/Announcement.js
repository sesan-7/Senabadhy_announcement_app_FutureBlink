import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Announcement", AnnouncementSchema);
