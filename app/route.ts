// cspell:disable
import Redis from "ioredis";
import {setupResidenceListener} from "../get-all-rooms";
import {generateResidentsPDF} from "./generate-pdf";

const redis = new Redis({
	host: process.env.REDIS_HOST,
	port: parseInt(process.env.REDIS_PORT),
	password: process.env.REDIS_PASSWORD,
	connectTimeout: 100_000,
});

// Set up Firestore listener for real-time updates
setupResidenceListener(redis, "residents-pdf");

// Add base64 for the logo if you want it embedded
// You can convert the logo into base64 using an online tool and place the result here

export async function GET() {
	const cacheKey = "residents-pdf";
	try {
		const cachedPDF = await redis.get(cacheKey);
		if (cachedPDF) {
			const pdfBuffer = Buffer.from(cachedPDF, "base64")
			return new Response(
				pdfBuffer,
				{
					headers: {
						"content-type": "application/pdf",
						"content-disposition":
							'attachment; filename="Residents Qr Codes.pdf"',
						"content-length": pdfBuffer.length.toString(),
						// Explicitly prevent compression/modification
						"content-encoding": "identity",
					},
				}
			);
		}
	} catch (error) {
		console.error("Redis get operation failed!", error); // Log the actual error
	}
	try {
		const pdfBuffer = await generateResidentsPDF();
		const pdfBase64 = pdfBuffer.toString("base64");

		// Set cache only if pdfBuffer is not empty
		if (pdfBuffer.length > 0) {
			// Use await with try...catch for Redis setex
			try {
				await redis.setex(cacheKey, 3600, pdfBase64);
			} catch (redisError) {
				console.error("Redis setex operation failed!", redisError);
				// Decide if you want to proceed without caching or return an error
			}
		} else {
			console.warn("Generated PDF buffer is empty. Not caching.");
		}

		return new Response(pdfBuffer, {
			headers: {
				"content-type": "application/pdf",
				"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
				"content-length": pdfBuffer.length.toString(),
				// Explicitly prevent compression/modification
				"content-encoding": "identity",
			},
		});
	} catch (error) {
		console.error("Printing QR's failed: ", error);
		// Return an actual error response
		return new Response("Failed to generate PDF.", {status: 500});
	}
}
