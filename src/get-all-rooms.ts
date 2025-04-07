import db from "./firebase-server-config.js";
import {generateResidentsPDF} from "./generate-pdf.js";

export async function getAllRooms() {
	try {
		const roomsCollection = db.collection("residence");
		const roomsSnap = await roomsCollection.get();
		// Consider if specific handling is needed when no rooms are found,
		// otherwise let the PDF generation handle an empty list if necessary.
		if (!roomsSnap.size) {
			console.warn("No residence documents found in Firestore collection.");
			// Depending on requirements, you might want to:
			// - return an empty array: return [];
			// - throw an error: throw new Error("No residence data found.");
			return []; // Returning empty array for now
		}
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

export function setupResidenceListener() {
	const roomsCollection = db.collection("residence");
	roomsCollection.onSnapshot(async () => {
		try {
			await generateResidentsPDF();
			console.log("PDF regenerated and saved due to Firestore changes.");
		} catch (error) {
			throw new Error("Failed to regenerate PDF on Firestore change:" + error.toString());
		}
	});
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

