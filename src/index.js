import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

const app = express();

app.use(cors(
  {
    exposedHeaders: ["Content-Disposition"], //allow client to access this header
  }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //only looks at url encoded requests
// app.use((req, res, next) => {
//   res.setHeader("Content-Type", "application/json");
//   next();
// });

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Since __dirname is not supported in module syntax
const __dirname = path.resolve();

const TEMP_DIR = path.join(__dirname, "TEMP");

// Ensure the TEMP directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.get("/healthcheck", async (req, res) => {
  res.send("Working fine..");
});

app.post("/api/video-info", async (req, res) => {
  const { url } = req.body;
  console.log("url request: ", url);
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid url" });
  }

  try {
    const info = await ytdl.getInfo(url);
    const videoDetails = {
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[1],
      videoFormats: info.formats
        .filter((format) => format.hasVideo)
        .map((format) => ({
          quality: format.qualityLabel,
          mimeType: format.mimeType,
          type: format.container,
          itag: format.itag, //since it is unique
          url: format.url,
        })),
      audioFormats: info.formats
        .filter((format) => format.hasAudio)
        .map((format) => ({
          quality: format.audioQuality,
          bitrate: format.audioBitrate,
          type: format.container,
          codec: format.codecs,
          itag: format.itag,
          url: format.url,
        })),
      originalUrl: url,
    };
    res.json(videoDetails);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch video information" });
  }
});

app.get("/api/download", async (req, res) => {
  const { url, videoFormatTag, audioFormatTag } = req.query;

  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const info = await ytdl.getInfo(url);

    const title = info.videoDetails.title;

    const sanitizeTitle = (title) => {
      return title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
    };

    const videoFormat = info.formats.find(
      (f) => f.itag === parseInt(videoFormatTag) && f.hasVideo && !f.hasAudio
    );

    const audioFormat = info.formats.find(
      (f) => f.itag === parseInt(audioFormatTag) && f.hasAudio && !f.hasVideo
    );

    if (!videoFormat || !audioFormat) {
      return res.status(400).json({ error: "Invalid format tags selected." });
    }

    const videoTempPath = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);
    const audioTempPath = path.join(TEMP_DIR, `audio_${Date.now()}.mp3`);

    // Download video and audio to temporary files
    console.log("Downloading video...");
    const videoStream = ytdl(url, { quality: videoFormat.itag }).pipe(
      fs.createWriteStream(videoTempPath)
    );

    console.log("Downloading audio...");
    const audioStream = ytdl(url, { quality: audioFormat.itag }).pipe(
      fs.createWriteStream(audioTempPath)
    );

    await Promise.all([
      new Promise((resolve) => videoStream.on("finish", resolve)),
      new Promise((resolve) => audioStream.on("finish", resolve)),
    ]);

    console.log("Merging video and audio...");
    const outputFileName = `merged_${Date.now()}.mp4`;
    const outputFilePath = path.join(TEMP_DIR, outputFileName);

    ffmpeg()
      .input(videoTempPath)
      .input(audioTempPath)
      .outputOptions("-c:v copy") // Copy video stream without re-encoding
      .outputOptions("-c:a aac") // Ensure audio is in a compatible format
      .save(outputFilePath)
      .on("end", () => {
        console.log("Merging completed successfully");
        const sanitizedTitle = sanitizeTitle(title);

        // Manually setting the content-disposition header
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${sanitizedTitle}.mp4"`
        );
        res.setHeader("Content-Type", "video/mp4");

        // Send the file to the client
        res.download(outputFilePath, `${sanitizedTitle}.mp4`, (err) => {
          if (err) {
            console.error("Error sending file:", err);
            res.status(500).json({ error: "Failed to send file" });
          }

          // Clean up temporary files
          fs.unlinkSync(videoTempPath);
          fs.unlinkSync(audioTempPath);
          fs.unlinkSync(outputFilePath);
        });
      })
      .on("error", (err) => {
        console.error("Error during merging:", err.message);
        res.status(500).json({ error: "Failed to merge video and audio" });

        // Clean up temporary files
        fs.unlinkSync(videoTempPath);
        fs.unlinkSync(audioTempPath);
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to download and merge files" });
  }
});
