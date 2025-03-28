// cspell:disable
import jsPDF from "jspdf";
import {NextResponse} from "next/server";
//import logo from "./logo";
import QRcode from "qrcode";
import Redis from "ioredis";
import {getAllRooms, Residence} from "../get-all-rooms";

const redis = new Redis({
	host: process.env.REDIS_HOST,
	port: parseInt(process.env.REDIS_PORT),
	password: process.env.REDIS_PASSWORD,
	connectTimeout: 100_000,
});

// Add base64 for the logo if you want it embedded
// You can convert the logo into base64 using an online tool and place the result here

export const dynamic = "force-dynamic";
export async function GET() {
	const cacheKey = "residents-pdf"; // Define a cache key for the generated PDF

	// Check Redis for cached PDF
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

		const doc = new jsPDF();

		await Promise.all(
			rooms.map(
				async ({id, roomNo, address}: Residence & {id: string}, idx) => {
					const qrCodeDataUri = await QRcode.toDataURL(
						new URL(`/room/${id}/`, process.env.DOMAIN).toString()
					);

					// Add the LinkID logo at the top
					//doc.addImage(logo, "PNG", 77, 60, 55, 20); // Adjust dimensions and position as needed

					// Add the resident information title
					doc.setFontSize(20);
					doc.setFont("Helvetica", "bold"); // Styling
					doc.text("RESIDENT INFORMATION - SCAN TO REVEAL", 30, 90); // Adjust position
					doc.setFont("Helvetica", "normal");

					// Add the QR code
					doc.setLineWidth(8);
					doc.setDrawColor(255, 0, 0);
					doc.rect(75, 100, 60, 60);
					doc.addImage(qrCodeDataUri, "PNG", 75, 100, 60, 60); // Centered below text
					doc.setFont("Helvetica", "bold"); // Styling
					doc.text("INSTANT ACCESS TO EMERGENCY INFO", 35, 183); // Adjust position
					let street = address
						.match(/^[A-Za-z ]+(?=\s\d)/gm)
						?.join(" ")
						.toUpperCase();

					if (!street)
						throw new Error(
							"Please provide the street name to address: " + address
						);
					const streetRaw = street.split(" ");
					const regex = /^(?!.*(ROAD|STREET|RD|ST|DRIVE|WAY)).+$/;
					const streetName = streetRaw.filter((word) => regex.test(word));

					doc.setFontSize(16);
					doc.setFont("Helvetica", "normal");
					doc.text(streetName.join(""), 75, 173); // Adjust position
					doc.text("-", 112, 173); // Adjust position
					doc.text("#" + roomNo, 120, 173); // Adjust position

					if (idx < rooms.length - 1) doc.addPage(); // Add new page for next resident
				}
			)
		);

		// Convert the document to arraybuffer and base64 encode it
		const pdfOutput = doc.output("arraybuffer");
		const pdfBase64 = Buffer.from(pdfOutput).toString("base64");

		// Cache the generated PDF in Redis for 1 hour (3600 seconds)
		await redis.setex(cacheKey, 3600, pdfBase64);

		return new NextResponse(new Uint8Array(doc.output("arraybuffer")), {
			headers: {
				"content-type": "application/pdf",
				"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
			},
		});
	} catch (error) {
		console.error("Printing QR's failed: ", error);
	}
}
