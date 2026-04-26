const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://localhost:27017/smart-meeting-assistant",
  )
  .then(async () => {
    const Meeting = require("./models/Meeting");

    const result = await Meeting.updateMany(
      { "host.userId": "default_user" },
      {
        $set: {
          "host.userId": "6953c9a2b791f6d6ea12f2d2",
          "host.name": "Aniket Kasav",
          "participants.0.userId": "6953c9a2b791f6d6ea12f2d2",
          "participants.0.name": "Aniket Kasav",
        },
      },
    );

    console.log("Updated:", result.modifiedCount, "meetings");
    process.exit();
  });
