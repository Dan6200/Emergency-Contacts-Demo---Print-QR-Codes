// cspell:disable
import {NextResponse} from "next/server";
import Redis from "ioredis";
import {setupResidenceListener, getAllRooms} from "../get-all-rooms";
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

export const dynamic = "force-dynamic";

export async function GET() {
	const cacheKey = "residents-pdf";
	try {
		const cachedPDF = await redis.get(cacheKey);
		if (cachedPDF) {
			return new NextResponse(
				new Uint8Array(Buffer.from(cachedPDF, "base64")),
				{
					headers: {
						"content-type": "application/pdf",
						"content-disposition":
							'attachment; filename="Residents Qr Codes.pdf"',
					},
				}
			);
		}
	} catch (error) {
		console.error("Redis get operation failed!");
	}
	try {
		const rooms = await getAllRooms().catch((e) => {
			throw new Error("Failed to Retrieve Residents Data -- Tag:24.\n\t" + e);
		});

		const pdfBuffer = await generateResidentsPDF();
		const pdfBase64 = pdfBuffer.toString("base64");


		await redis.setex(cacheKey, 3600, pdfBase64);

		return new NextResponse(new Uint8Array(pdfBuffer), {
			headers: {
				"content-type": "application/pdf",
				"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
			},
		});
	} catch (error) {
		console.error("Printing QR's failed: ", error);
	}
}
