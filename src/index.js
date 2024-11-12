import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true})); //only looks at url encoded requests
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

app.get("/healthcheck", async(req, res) => {
    res.send("Working fine..");
})

app.post("/api/video-info", async(req, res) => {
    const {url}  = req.body;
    console.log("url request: ",url)
    if(!ytdl.validateURL(url)) {
        return res
        .status(400)
        .json({ error: "Invalid url"});
    }

    try {
        const info = await ytdl.getInfo(url);
        const videoDetails = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[1],
            videoFormats: info.formats
            .filter(format => format.hasVideo)
            .map(format => ({
                quality: format.qualityLabel,
                mimeType: format.mimeType,
                type: format.container,
                url: format.url,
            })),
            audioFormats: info.formats
            .filter(format => format.hasAudio)
            .map(format => ({
                quality: format.audioQuality,
                bitrate: format.audioBitrate,
                type: format.container,
                codec: format.codecs,
                url: format.url,
            })),
        };
        res.json(videoDetails);
    } catch (error) {
        console.log(error);
        res
        .status(500)
        .json({ error: "Failed to fetch video information"})
    }
});

app.get("/api/download", async(req, res) => {
    const {url, videoFormat, audioFormat} = req.query;

    if(!ytdl.validateURL(url)) {
        return res
        .status(400)
        .json({ error: "Invalid url"});
    }

    try {
        // temporary file paths
        const __dirname = path.resolve();
        const videoPath = path.join(__dirname, 'temp_video.mp4');
        const audioPath = path.join(__dirname, 'temp_audio.mp4');
        const outputPath = path.join(__dirname, 'output_video.mp4');

        // Download video and audio streams
        const videoStream = ytdl(url, { quality: videoFormat });
        const audioStream = ytdl(url, { quality: audioFormat });

        // Save video and audio to temporary files
        videoStream.pipe(fs.createWriteStream(videoPath));
        audioStream.pipe(fs.createWriteStream(audioPath));

        // downloads have to be completed before merging
        videoStream.on("end", () => {
            audioStream.on("end", () => {
                // merge video and audio files
                ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .output(outputPath)
                .on("end", () => {
                    // on completion send merged file as response
                    res.download(outputPath, 'video_with_audio.mp4', (err) => {
                        if (err) console.error("Error during download: ",err);

                        // delete temporary files
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(audioPath);
                        fs.unlinkSync(outputPath);
                    })
                })
                .on("error", (err) => {
                    console.error('Error during merging', err);
                    res.status(500).json({ error: 'Failed to merge video and audio' });
                })
                .run();
            });
        });
    } catch (error) {
        console.error(error);
        res
        .status(500)
        .json({ error: "Failed to download and merge files"});
    }
})