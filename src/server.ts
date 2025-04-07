import express, {Express, Request, Response} from 'express';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdf-routes'; // Adjust path relative to dist
import {setupResidenceListener} from './get-all-rooms'; // Adjust path relative to dist

// Load environment variables from .env file
dotenv.config();

// Ensure necessary environment variables are set
if (!process.env.FB_PROJECT_ID || !process.env.FB_CLIENT_EMAIL || !process.env.FB_PRIVATE_KEY) {
	console.error("FATAL ERROR: Firebase credentials environment variables are not set.");
	process.exit(1); // Exit if essential config is missing
}
if (!process.env.DOMAIN) {
	console.error("FATAL ERROR: DOMAIN environment variable is not set.");
	process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 3001; // Use PORT from env or default to 3001

// Middleware (optional, add as needed)
// app.use(express.json()); // Example: if you need to parse JSON bodies

// Mount the PDF routes
app.use('/pdf', pdfRoutes);

// Basic route for health check or root access
app.get('/', (req: Request, res: Response) => {
	res.send('Express PDF Service Running');
});

// Initialize Firestore listener only when not in a build environment
// (Assuming BUILD_ENV indicates a build process like Docker build)
if (!process.env.BUILD_ENV) {
	try {
		console.log("Setting up Firestore listener...");
		setupResidenceListener();
		console.log("Firestore listener started successfully.");
	} catch (error) {
		console.error("Failed to set up Firestore listener:", error);
		// Decide if this is fatal. If the app relies heavily on the listener, maybe exit.
		// process.exit(1);
	}
} else {
	console.log("Skipping Firestore listener setup in BUILD_ENV.");
}


// Start the server
app.listen(port, () => {
	console.log(`[server]: Server is running at http://localhost:${port}`);
});

// Optional: Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('SIGINT signal received: closing HTTP server');
	// Add cleanup logic here (e.g., close database connections)
	process.exit(0);
});

