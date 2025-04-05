import Redis from "ioredis";
import path from 'path';
import {generateResidentsPDF} from "./generate-pdf";

/**
 * Checks if the PDF is already cached in Redis. If not, generates the PDF
 * using data from Firestore and caches it. This is useful for ensuring
 * the PDF is available on application startup before any Firestore changes occur.
 * @param redis - The ioredis client instance.
 * @param cacheKey - The key to use for caching the PDF in Redis.
 */
export async function pregenerateAndCachePDF(redis: Redis, cacheKey: string) {
	try {
		const cachedPdf = await redis.get(cacheKey);
		if (cachedPdf) {
			console.log("PDF already pre-cached.");
			return;
		}

		console.log("Pregenerating and caching PDF...");
		await generateResidentsPDF();
		const pdf = path.resolve('/app/persistent/Residents_QR_Code.pdf')
		// Use the same TTL (Time To Live) as the listener for consistency
		await redis.setex(cacheKey, 3600, pdf);
		console.log("PDF pregenerated and cached successfully.");
	} catch (error) {
		throw new Error("Failed to pregenerate and cache PDF:" + error.toString());
		// Depending on your application's needs, you might want to handle this error more gracefully
		// or even prevent the application from starting if the initial PDF is critical.
	}
}

