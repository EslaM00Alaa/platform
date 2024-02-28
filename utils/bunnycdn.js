// const multer = require("multer");

// const BunnyCDN = require('bunnycdn');

// const { Readable } = require('stream');
// const dotenv = require('dotenv');

// dotenv.config();

// // Configure BunnyCDN
// const bunny = new BunnyCDN.default({
//   pullzone: process.env.BUNNY_NET_PULLZONE,
//   accessKey: process.env.BUNNY_NET_ACCESS_KEY,
//   storageZoneName: process.env.BUNNY_NET_STORAGEZONE_NAME,
//   storageZonePassword: process.env.BUNNY_NET_STORAGEZONE_PASSWORD
// });

// // Create a Multer storage engine that streams the file to BunnyCDN
// const storage = multer.memoryStorage();

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 1024 * 1024 * 10000 } // Adjust as needed
// }).single('video'); // Assuming the field name in your form is 'video'

// // Middleware to handle the file upload
// const uploadVideo = (req, res, next) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({ error: err.message });
//     }

//     // Check if file exists
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     try {
//       const fileBuffer = req.file.buffer;
//       const stream = new Readable();
//       stream.push(fileBuffer);
//       stream.push(null);

//       // Upload file to BunnyCDN storage zone
//       await bunny.storage.upload(stream, req.file.originalname);

//       res.status(200).json({ message: 'File uploaded successfully' });
//     } catch (error) {
//       console.error('Error uploading file to BunnyCDN:', error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   });
// };


// const deleteVideoById = async (videoId) => {
//     try {
//       // Get list of files in storage zone
//       const files = await bunny.storage.list();
  
//       // Find the file with matching ID
//       const videoFile = files.find(file => file.name === videoId);
  
//       if (!videoFile) {
//         throw new Error('Video not found in storage');
//       }
  
//       // Delete the file from storage
//       await bunny.storage.delete(videoFile.id);
  
//       console.log(`Video with ID ${videoId} deleted successfully from BunnyCDN storage`);
//       return true; // Indicate success
//     } catch (error) {
//       console.error('Error deleting video from BunnyCDN:', error);
//       throw new Error('Failed to delete video from BunnyCDN storage');
//     }
//   };
  

// module.exports = {uploadVideo,deleteVideoById};

