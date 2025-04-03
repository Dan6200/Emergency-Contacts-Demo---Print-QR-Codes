import {notFound} from "next/navigation";
import db from "./firebase-server-config";
import Redis from "ioredis";
import {generateResidentsPDF} from "./app/route";

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

export function setupResidenceListener(redis: Redis, cacheKey: string) {
	const roomsCollection = db.collection("residence");
	roomsCollection.onSnapshot(async () => {
		try {
			const pdfBuffer = await generateResidentsPDF();
			const pdfBase64 = pdfBuffer.toString("base64");
			await redis.setex(cacheKey, 3600, pdfBase64);
			console.log("PDF regenerated and cached due to Firestore changes.");
		} catch (error) {
			console.error("Failed to regenerate PDF on Firestore change:", error);
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

