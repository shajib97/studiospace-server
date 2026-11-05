const express = require("express");
const { ObjectId } = require("mongodb");
const verifyJWT = require("../middleware/verifyJWT");
const router = express.Router();

const categories = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
];

router.get("/featured", async (req, res) => {
  try {
    const db = req.app.locals.db;

    const studios = await db
      .collection("studios")
      .find({})
      .sort({ _id: -1 })
      .limit(6)
      .project({
        title: 1,
        category: 1,
        hourlyRate: 1,
        location: 1,
        imageUrl: 1,
        rating: 1,
        reviewCount: 1,
      })
      .toArray();

    res.json({
      success: true,
      data: studios,
    });
  } catch (error) {
    console.error("Failed to fetch featured studios:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load featured studios. Please try again.",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const db = req.app.locals.db;

    const studio = await db.collection("studios").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          title: 1,
          category: 1,
          hourlyRate: 1,
          securityDeposit: 1,
          maxCapacity: 1,
          location: 1,
          imageUrl: 1,
          gallery: 1,
          amenities: 1,
          overview: 1,
          ownerName: 1,
          rating: 1,
          reviewCount: 1,
        },
      },
    );

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    res.json({
      success: true,
      data: studio,
    });
  } catch (error) {
    console.error("Failed to fetch studio details:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load studio details. Please try again.",
    });
  }
});
router.get("/", async (req, res) => {
  try {
    const category = req.query.category;
    const filter = {};

    if (category !== undefined) {
      if (typeof category !== "string" || !categories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid studio category.",
        });
      }

      filter.category = category;
    }

    const db = req.app.locals.db;

    const studios = await db
      .collection("studios")
      .find(filter)
      .sort({ _id: -1 })
      .project({
        title: 1,
        category: 1,
        hourlyRate: 1,
        location: 1,
        imageUrl: 1,
        rating: 1,
        reviewCount: 1,
      })
      .toArray();

    res.json({
      success: true,
      data: studios,
    });
  } catch (error) {
    console.error("Failed to fetch studios:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load studios. Please try again.",
    });
  }
});
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
      message: "Send the studio details as JSON.",
    });
  }

  const {
    title,
    category,
    hourlyRate,
    securityDeposit,
    maxCapacity,
    location,
    imageUrl,
    amenities,
    overview,
  } = req.body ?? {};

  const textFields = [title, location, overview];

  for (const field of textFields) {
    if (typeof field !== "string" || !field.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title, location, and overview are required.",
      });
    }
  }

  if (!categories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Please select a valid studio category.",
    });
  }

  if (
    !Number.isFinite(hourlyRate) ||
    hourlyRate <= 0 ||
    !Number.isFinite(securityDeposit) ||
    securityDeposit < 0 ||
    !Number.isInteger(maxCapacity) ||
    maxCapacity < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid hourly rate, deposit, and capacity.",
    });
  }

  if (
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("https://i.ibb.co/")
  ) {
    return res.status(400).json({
      success: false,
      message: "Please upload a studio photo using ImgBB.",
    });
  }

  if (
    !Array.isArray(amenities) ||
    amenities.some((item) => typeof item !== "string" || !item.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "Amenities must be a list of names.",
    });
  }

  try {
    const db = req.app.locals.db;
    const userId = req.auth.userId;

    const ownerId = /^[a-fA-F0-9]{24}$/.test(userId)
      ? new ObjectId(userId)
      : userId;

    const owner = await db
      .collection("user")
      .findOne({ _id: ownerId }, { projection: { name: 1, email: 1 } });

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: "Your account could not be found. Please log in again.",
      });
    }

    const result = await db.collection("studios").insertOne({
      title: title.trim(),
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location: location.trim(),
      imageUrl,
      amenities: amenities.map((item) => item.trim()),
      overview: overview.trim(),
      ownerId: userId,
      ownerName: owner.name,
      ownerEmail: owner.email,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Studio added successfully.",
      studioId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add studio:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add the studio. Please try again.",
    });
  }
});
module.exports = router;
