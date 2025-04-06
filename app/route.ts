// cspell:disable
import {setupResidenceListener} from "../get-all-rooms";
import {generateResidentsPDF, RESIDENTS_PDF_PATH} from "../generate-pdf";
import fs from 'fs/promises'

if (!process.env.BUILD_ENV)
	setupResidenceListener();

// Add base64 for the logo if you want it embedded
// You can convert the logo into base64 using an online tool and place the result here

export async function GET() {
	try {
		const stat = await fs.stat(RESIDENTS_PDF_PATH)
		return new Response(
			RESIDENTS_PDF_PATH,
			{
				headers: {
					"content-type": "application/pdf",
					"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
					"content-length": stat.size.toString(),
					// Explicitly prevent compression/modification
					"content-encoding": "identity",
				},
			}
		);
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.warn("PDF File does not exist. Generating...");
			// Wait for the PDF generation to complete before proceeding
			await generateResidentsPDF();
		}
		else {
			if (process.env.BUILD_ENV)
				throw new Error('An Unexpected Error Occurred.')
			return new Response("An Unexpected Error Occurred.", {status: 500});
		}
	}
	// Now try accessing the file again after generation attempt
	try {
		const stat = await fs.stat(RESIDENTS_PDF_PATH)
		return new Response(RESIDENTS_PDF_PATH, {
			headers: {
				"content-type": "application/pdf",
				"content-disposition": 'attachment; filename="Residents Qr Codes.pdf"',
				"content-length": stat.size.toString(),
				// Explicitly prevent compression/modification
				"content-encoding": "identity",
			},
		});
	} catch (error) {
		if (process.env.BUILD_ENV) throw new Error('Failed to generate PDF.')
		// Return an actual error response
		return new Response("Failed to generate PDF.", {status: 500});
	}
}
