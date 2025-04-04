import {getApp, initializeApp} from "firebase-admin/app";
import fbAdmin from "firebase-admin";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

const {credential} = fbAdmin;
let auth = null;
let db = null;

// Dont run during build as build env has no env secrets
const appName = "emergency-contact-demo-print-qr";
if (!fbAdmin.apps.find((app) => app?.name === appName))
	initializeApp(
		{
			credential: credential.cert({
				projectId: process.env.FB_PROJECT_ID ?? "",
				clientEmail: process.env.FB_CLIENT_EMAIL ?? "",
				privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
			}),
		},
		appName
	);
auth = getAuth(getApp(appName));
db = getFirestore(getApp(appName));
console.log(process.env.REDIS_HOST)

export {auth};
export default db;
