// No more redis
// import {generateResidentsPDF, RESIDENTS_PDF_PATH} from "./generate-pdf";
//
// /**
//  * Checks if the PDF is already cached in Redis. If not, generates the PDF
//  * using data from Firestore and caches it. This is useful for ensuring
//  * the PDF is available on application startup before any Firestore changes occur.
//  * @param redis - The ioredis client instance.
//  * @param cacheKey - The key to use for caching the PDF in Redis.
//  */
// async function pregeneratePDF() {
// 	try {
// 		const cachedPdf = RESIDENTS_PDF_PATH
// 		if (cachedPdf) {
// 			console.log("PDF already pre-cached.");
// 			return;
// 		}
//
// 		console.log("Pregenerating and caching PDF...");
// 		await generateResidentsPDF();
// 		// Use the same TTL (Time To Live) as the listener for consistency
// 		console.log("PDF pregenerated successfully.");
// 	} catch (error) {
// 		throw new Error("Failed to pregenerate PDF:" + error.toString());
// 		// Depending on your application's needs, you might want to handle this error more gracefully
// 		// or even prevent the application from starting if the initial PDF is critical.
// 	}
// }
//
// if (process.env.BUILD_ENV) pregeneratePDF()
