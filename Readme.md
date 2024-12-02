# YouTube Video Downloader - Backend
This is the backend repository for the YouTube Video Downloader application. It provides server-side functionality for handling video downloading and processing requests.

## Tech Stack
- Node.js: JavaScript runtime for building server-side applications.
- Express.js: Minimalist web framework for routing and API handling.
- ffmpeg: A multimedia framework used for video and audio processing.
- fluent-ffmpeg: a library which simplifies the usage of ffmpeg via command line.
- distube/ytdl-core: A YouTube video downloader library to fetch video and audio streams.

## Features
- Video Downloading: Fetches video or audio streams from YouTube using distube/ytdl-core. Supports different video formats and resolutions.
- Audio-Video Merging: Uses ffmpeg to merge separate video and audio streams.
- Temporary File Management: Generates temporary files for merged outputs and cleans up after processing.
- Efficient API Routing: Routes requests for specific video processing tasks like downloading, merging, and returning the final file.
- Error Handling: Includes robust error handling for invalid URLs, unsupported formats, and other runtime issues.
- Server sent events: used server sent events to send realtime updates about video download process.

## Project setup instructions
- Clone the repository
````
git clone https://github.com/tejasg99/youtube-downloader-backend.git
````
- Navigate to the project directory
````
cd youtube-downloader-backend
````
- Install dependencies
````
npm install
````
- Configure environment variables
    - Create a .env file in the root directory and add the following configuration
````
PORT=<desired_port>
````
- Add a script in package.json to run the server with nodemon
````
"dev": "nodemon src/index.js"
````
- Start the server
````
npm run dev
````
- The backend server should be running now.