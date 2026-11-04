const exptress = require("express");
const router = exptress.Router();

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
router.get("/", async (req, res) => {
  try {
    const categories = [
      "Photo Studio",
      "Film Stage",
      "Podcast Lounge",
      "Music Suite",
      "Workshop",
    ];

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

module.exports = router;
