// const multer = require("multer");
// const path = require("path");
// const ffmpeg = require("fluent-ffmpeg");

// // video storage
// const videoStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(__dirname, "../videos"));
//   },
//   filename: function (req, file, cb) {
//     cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
//   },
// });

// // video upload middleware
// const videoUpload = multer({
//   storage: videoStorage,
//   fileFilter: function (req, file, cb) {
//     if (file.mimetype.startsWith("video")) cb(null, true);
//     else cb({ message: "Unsupported File format" }, false);
//   },
//   limits: { fileSize: 1024 * 1024 * 10000 }, // Adjust the file size limit as needed
// }).single("video");

// // Middleware to compress videos using ffmpeg
// function compressVideo(req, res, next) {
//   if (!req.file) {
//     return next(); // No video file, skip compression
//   }

//   const inputPath = req.file.path;
//   const outputPath = path.join(__dirname, "../videos", req.file.filename);

//   ffmpeg(inputPath)
//     .videoCodec("libx264")
//     .audioCodec("aac")
//     .format("mp4")
//     .outputOptions("-preset ultrafast") // Adjust compression settings as needed
//     .on("end", function () {
//       // Compression completed, proceed to next middleware
//       req.file.path = outputPath; // Update file path to compressed video
//       next();
//     })
//     .on("error", function (err) {
//       console.error("Error compressing video:", err);
//       next(err); // Pass error to error handling middleware
//     })
//     .save(outputPath);
// }

// module.exports = {
//   videoUpload,
//   compressVideo,
// };
