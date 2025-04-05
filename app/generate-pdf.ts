import jsPDF from "jspdf";
//import logo from "./logo";
import QRcode from "qrcode";
import {getAllRooms, Residence} from "../get-all-rooms";

export async function generateResidentsPDF(): Promise<Buffer> {
	const rooms = await getAllRooms().catch((e) => {
		throw new Error("Failed to Retrieve Residents Data -- Tag:24.\n\t" + e);
	});

	const doc = new jsPDF();

	await Promise.all(
		rooms.map(
			async ({id, roomNo, address}: Residence & {id: string}, idx: number) => {
				const qrCodeDataUri = await QRcode.toDataURL(
					new URL(`/room/${id}/`, process.env.DOMAIN).toString()
				);

				doc.setFontSize(20);
				doc.setFont("Helvetica", "bold");
				doc.text("RESIDENT INFORMATION - SCAN TO REVEAL", 30, 90);
				doc.setFont("Helvetica", "normal");

				doc.setLineWidth(8);
				doc.setDrawColor(255, 0, 0);
				doc.rect(75, 100, 60, 60);
				doc.addImage(qrCodeDataUri, "PNG", 75, 100, 60, 60);
				doc.setFont("Helvetica", "bold");
				doc.text("INSTANT ACCESS TO EMERGENCY INFO", 35, 183);

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
				doc.text(streetName.join(""), 75, 173);
				doc.text("-", 112, 173);
				doc.text("#" + roomNo, 120, 173);

				if (idx < rooms.length - 1) doc.addPage();
			}
		)
	);

	return Buffer.from(new Uint8Array(doc.output("arraybuffer")));
}


