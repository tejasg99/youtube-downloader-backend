import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";

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