import {Request, Response} from 'express';
import fs from 'fs/promises';
import {generateResidentsPDF, RESIDENTS_PDF_PATH} from '../../generate-pdf'; // Adjust path relative to dist/controllers

/**
 * @description Handles the request to download the residents QR code PDF.
 * Checks if the PDF exists, generates it if not, and then sends it to the client.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 */
export const downloadPdf = async (_req: Request, res: Response): Promise<void> => {
	const pdfFileName = 'residents_qr_codes.pdf';

	try {
		// Check if the file exists
		await fs.access(RESIDENTS_PDF_PATH);
		console.log(`PDF found at ${RESIDENTS_PDF_PATH}. Sending existing file.`);
		// Use res.download to send the file
		res.download(RESIDENTS_PDF_PATH, pdfFileName, (err) => {
			if (err) {
				// Handle errors that occur *after* headers may have been sent
				console.error('Error sending PDF file:', err);
				// Avoid sending another response if headers are already sent
				if (!res.headersSent) {
					res.status(500).send('Error sending PDF file.');
				}
			}
		});
	} catch (error: any) {
		// If error is ENOENT (file not found), generate it
		if (error.code === 'ENOENT') {
			console.warn(`PDF file not found at ${RESIDENTS_PDF_PATH}. Generating...`);
			try {
				// Wait for the PDF generation to complete
				await generateResidentsPDF();
				console.log('PDF generated successfully. Sending new file.');
				// Attempt to send the newly generated file
				res.download(RESIDENTS_PDF_PATH, pdfFileName, (err: any) => {
					if (err) {
						console.error('Error sending newly generated PDF file:', err);
						if (!res.headersSent) {
							res.status(500).send('Error sending generated PDF file.');
						}
					}
				});
			} catch (generationError) {
				console.error('Failed to generate PDF:', generationError);
				res.status(500).send('Failed to generate PDF.');
			}
		} else {
			// Handle other fs.access errors (permissions, etc.)
			console.error('Error accessing PDF file:', error);
			res.status(500).send('An unexpected error occurred while accessing the PDF file.');
		}
	}
};


