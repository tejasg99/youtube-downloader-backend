import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})

app.get("/", async(req, res) => {
    res.send("Working fine..");
})