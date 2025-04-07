import fs from 'fs/promises'
import {jsPDF} from 'jspdf';
import QRcode from "qrcode";
import {getAllRooms, Residence} from "./get-all-rooms.js";
import path from 'path'

export const RESIDENTS_PDF_PATH = path.resolve('/app/persistent/Residents_QR_Code.pdf')

export async function generateResidentsPDF() {
	const rooms = await getAllRooms().catch((e) => {
		throw new Error("Failed to Retrieve Residents Data -- Tag:24.\n\t" + e);
	});

	const doc = new jsPDF();
	const filePath = RESIDENTS_PDF_PATH
	console.log('Generating PDFs @: ', RESIDENTS_PDF_PATH)

	await Promise.all(
		rooms.map(
			async ({id, roomNo, address}: Residence & {id: string}, idx: number): Promise<void> => {
				const domain = process.env.DOMAIN;
				if (!domain) {
					// Log the error and skip this entry or throw, depending on desired behavior
					console.error(`Error: DOMAIN environment variable is not set. Skipping room ID: ${id}`);
					// Optionally throw an error to stop the whole process:
					// throw new Error("DOMAIN environment variable is not set.");
					return; // Skip this iteration
				}
				const qrCodeDataUri = await QRcode.toDataURL(
					new URL(`/room/${id}/`, domain).toString()
				);

				doc.setFontSize(20);
				doc.setFont("Helvetica");
				doc.text("RESIDENT INFORMATION - SCAN TO REVEAL", 30, 90);
				doc.setFont("Helvetica");

				doc.setLineWidth(8);
				doc.setDrawColor('red');
				// Draw the rectangle first if you want it behind the QR code
				doc.rect(75, 100, 60, 60).stroke(); // Example: draw red border

				// Use doc.image for data URIs
				doc.addImage(qrCodeDataUri, 75, 100, 60, 60);
				doc.setFont("Helvetica", "normal");
				// doc.text("INSTANT ACCESS TO EMERGENCY INFO", 35, 183, {align: "center"});
				doc.text("INSTANT ACCESS TO EMERGENCY INFO", 35, 183);

				// Extract the part of the address before the first digit, assumed to be the street name.
				const streetMatch = address.match(/^[A-Za-z ]+(?=\s\d)/);
				let street = streetMatch ? streetMatch[0].trim().toUpperCase() : null;


				if (!street)
					// Consider logging instead of throwing to allow other QR codes to generate
					console.error(
						"Please provide the street name to address: " + address
					);
				const streetRaw = street.split(" ");
				const regex = /^(?!.*(ROAD|STREET|RD|ST|DRIVE|WAY)).+$/;
				const streetName = streetRaw.filter((word) => regex.test(word));

				doc.setFontSize(16);
				doc.setFont("Helvetica", "normal");
				// Join with space for readability
				doc.text(streetName.join(" "), 75, 173);
				doc.text("-", 112, 173);
				doc.text("#" + roomNo, 120, 173);

				if (idx < rooms.length - 1) doc.addPage();
			}
		)
	);
	const buffer = Buffer.from(new Uint8Array(doc.output("arraybuffer")));
	await fs.writeFile(RESIDENTS_PDF_PATH, buffer)
	try {
		const stats = await fs.stat(filePath)
		console.log('PDF generated', stats)
	} catch {
		throw new Error('Failed to generate PDF')
	}
}
