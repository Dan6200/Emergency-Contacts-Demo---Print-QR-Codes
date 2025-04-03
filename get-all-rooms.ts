import {notFound} from "next/navigation";
import db from "./firebase-server-config";
import Redis from "ioredis";
import {generateResidentsPDF} from "./app/generate-pdf";

export async function getAllRooms() {
	try {
		const roomsCollection = db.collection("residence");
		const roomsSnap = await roomsCollection.get();
		if (!roomsSnap.size) throw notFound();
		return roomsSnap.docs.map((doc: {data: () => any; id: any;}) => {
			const residence = doc.data();
			if (!isTypeResidence(residence))
				throw new Error("Object is not of type Residence -- Tag:19");
			return {id: doc.id, ...residence};
		});
	} catch (error) {
		throw new Error("Failed to fetch All Room Data.\n\t\t" + error);
	}
}

// export function setupResidenceListener(redis: Redis, cacheKey: string) {
// 	const roomsCollection = db.collection("residence");
// 	roomsCollection.onSnapshot(async () => {
// 		try {
// 			const pdfBuffer = await generateResidentsPDF();
// 			const pdfBase64 = pdfBuffer.toString("base64");
// 			await redis.setex(cacheKey, 3600, pdfBase64);
// 			console.log("PDF regenerated and cached due to Firestore changes.");
// 		} catch (error) {
// 			console.error("Failed to regenerate PDF on Firestore change:", error);
// 		}
// 	});
// }
//
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
		const pdfBuffer = await generateResidentsPDF();
		const pdfBase64 = pdfBuffer.toString("base64");
		// Use the same TTL (Time To Live) as the listener for consistency
		await redis.setex(cacheKey, 3600, pdfBase64);
		console.log("PDF pregenerated and cached successfully.");
	} catch (error) {
		console.error("Failed to pregenerate and cache PDF:", error);
		// Depending on your application's needs, you might want to handle this error more gracefully
		// or even prevent the application from starting if the initial PDF is critical.
	}
}

export interface Residence {
	residence_id: string;
	roomNo: string;
	address: string;
}

const isTypeResidence = (data: unknown): data is Residence =>
	!!data &&
	typeof data === "object" &&
	"residence_id" in data &&
	"roomNo" in data &&
	"address" in data;

