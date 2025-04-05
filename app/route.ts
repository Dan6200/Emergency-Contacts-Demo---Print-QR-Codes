// cspell:disable
import Redis from "ioredis";
import {setupResidenceListener} from "../get-all-rooms";
import {generateResidentsPDF} from "./generate-pdf";
import fs from 'fs'
import path from "path";

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
			const pdf = cachedPDF
			const stat = await fs.promises.stat(pdf)
			return new Response(
				pdf,
				{
					headers: {
						"content-type": "application/pdf",
						"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
						"content-length": stat.size.toString(),
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
		await generateResidentsPDF();
		const pdf = path.resolve('/tmp/Residents_QR_Code.pdf')
		const stat = await fs.promises.stat(pdf)

		// Set cache only if pdfBuffer is not empty
		if (pdf) {
			// Use await with try...catch for Redis setex
			try {
				await redis.setex(cacheKey, 3600, pdf);
			} catch (redisError) {
				console.error("Redis setex operation failed!", redisError);
				// Decide if you want to proceed without caching or return an error
			}
		} else {
			console.warn("Generated PDF does not exist. Not caching.");
		}

		return new Response(pdf, {
			headers: {
				"content-type": "application/pdf",
				"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
				"content-length": stat.size.toString(),
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
