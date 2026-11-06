const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../middleware/verifyJWT");

const router = express.Router();

router.post("/", verifyJWT, async (req, res) => {
  if (req.get("origin") !== process.env.CLIENT_URL) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  if (!req.is("application/json")) {
    return res.status(415).json({
      success: false,
      message: "Send the booking details as JSON.",
    });
  }

  const { studioId, startTime, endTime } = req.body ?? {};

  if (typeof studioId !== "string" || !/^[a-fA-F0-9]{24}$/.test(studioId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid studio ID.",
    });
  }

  if (typeof startTime !== "string" || typeof endTime !== "string") {
    return res.status(400).json({
      success: false,
      message: "Choose a start time and an end time.",
    });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString() !== startTime ||
    end.toISOString() !== endTime ||
    start.getTime() <= Date.now() ||
    end.getTime() <= start.getTime()
  ) {
    return res.status(400).json({
      success: false,
      message: "Choose a future start time and an end time after it.",
    });
  }

  try {
    const db = req.app.locals.db;
    const studioObjectId = new ObjectId(studioId);

    const studio = await db
      .collection("studios")
      .findOne({ _id: studioObjectId }, { projection: { _id: 1 } });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    const bookings = db.collection("bookings");

    const overlappingBooking = await bookings.findOne({
      studioId: studioObjectId,
      status: "Confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This studio is already booked for that time. Choose another slot.",
      });
    }

    const result = await bookings.insertOne({
      studioId: studioObjectId,
      userId: req.auth.userId,
      startTime: start,
      endTime: end,
      status: "Pending",
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Booking request submitted.",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to create booking:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to submit the booking. Please try again.",
    });
  }
});
router.get("/mine", verifyJWT, async (req, res) => {
  res.set("Cache-Control", "private, no-store");

  try {
    const bookings = await req.app.locals.db
      .collection("bookings")
      .aggregate([
        { $match: { userId: req.auth.userId } },
        { $sort: { startTime: -1, _id: -1 } },
        {
          $lookup: {
            from: "studios",
            localField: "studioId",
            foreignField: "_id",
            as: "studio",
          },
        },
        {
          $project: {
            studioId: 1,
            startTime: 1,
            endTime: 1,
            status: 1,
            studioTitle: { $arrayElemAt: ["$studio.title", 0] },
          },
        },
      ])
      .toArray();

    return res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Failed to load bookings:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load your bookings. Please try again.",
    });
  }
});
router.patch("/:id/cancel", verifyJWT, async (req, res) => {
  if (req.get("origin") !== process.env.CLIENT_URL) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  const { id } = req.params;

  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking ID.",
    });
  }

  try {
    const result = await req.app.locals.db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        userId: req.auth.userId,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "This booking is no longer available to cancel.",
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel the booking. Please try again.",
    });
  }
});
module.exports = router;
