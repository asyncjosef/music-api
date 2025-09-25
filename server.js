const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const yts = require("yt-search");

const app = express();
app.use(cors());

/**
 * /audio?query=some song name
 * This endpoint searches for the song name, finds a YouTube result,
 * then downloads the audio and returns it.
 */
app.get("/audio", async (req, res) => {
  const q = req.query.query;
  if (!q) {
    return res.status(400).json({ error: "No search query provided", name: "Josef’s Audio API" });
  }

  try {
    // Search YouTube
    const result = await yts(q);
    if (!result || !result.videos || result.videos.length === 0) {
      return res.status(404).json({ error: "No video results found", name: "Josef’s Audio API" });
    }

    const video = result.videos[0];
    const url = video.url;

    console.log(`[Josef’s Audio API] Found video: ${video.title} → ${url}`);

    const output = path.join(__dirname, "song.mp3");
    // Use yt-dlp to extract audio only
    const cmd = `yt-dlp -x --audio-format mp3 -o "${output}" "${url}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("[Josef’s Audio API] yt-dlp error:", err);
        console.error("[Josef’s Audio API] stderr:", stderr);
        return res
          .status(500)
          .json({ error: "Audio download failed", name: "Josef’s Audio API", details: stderr });
      }

      console.log("[Josef’s Audio API] Downloaded audio, sending file.");

      res.download(output, "song.mp3", (err2) => {
        if (err2) {
          console.error("[Josef’s Audio API] Error sending file:", err2);
        } else {
          console.log("[Josef’s Audio API] Audio sent.");
          // Clean up
          fs.unlink(output, (unlinkErr) => {
            if (unlinkErr) console.error("[Josef’s Audio API] Error deleting file:", unlinkErr);
            else console.log("[Josef’s Audio API] Deleted temp file.");
          });
        }
      });
    });
  } catch (err) {
    console.error("[Josef’s Audio API] Error in search or overall flow:", err);
    return res.status(500).json({ error: "Internal error", name: "Josef’s Audio API", details: err.toString() });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Josef’s Audio API running on port ${PORT}`));
