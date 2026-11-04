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

module.exports = router;
