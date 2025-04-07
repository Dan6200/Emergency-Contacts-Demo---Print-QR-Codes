import {Router} from 'express';
import {downloadPdf} from '../controllers/pdf-controller.js'; // Adjust path relative to dist/routes

const router = Router();

// Define the route for downloading the PDF
// GET /pdf/download
router.get('/download', downloadPdf);

export default router;
