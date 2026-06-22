import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

const extractCNICData = (text) => {
  const cnicPattern = /\b\d{5}[-\s]\d{7}[-\s]\d\b/;
  const cnicMatch = text.match(cnicPattern);
  
  // Use [A-Za-z \t.-] to exclude newlines but allow spaces, dots, and hyphens in names
  const namePattern = /(?:Name(?:\s*\/\s*Name)?[\s:]+)([A-Za-z \t.-]{3,})/i;
  const nameMatch = text.match(namePattern);
  
  const fatherPattern = /(?:Father(?:'s)?(?:\s*Name)?(?:\s*\/\s*Father\s*Name)?[\s:]+)([A-Za-z \t.-]{3,})/i;
  const fatherMatch = text.match(fatherPattern);
  
  // Support Date of Birth, DOB, D.O.B with slashes, hyphens or dots and optional internal spacing
  const dobPattern = /(?:Date of Birth|DOB|D\.O\.B)[\s:/.-]*(\d{2}\s*[/.-]\s*\d{2}\s*[/.-]\s*\d{4})/i;
  const dobMatch = text.match(dobPattern);
  
  // Support alphanumeric characters, spaces, commas, dots, slashes, hyphens, and hash signs
  const addressPattern = /Address[\s:/.-]+([A-Za-z0-9 \t,./#-]{10,})/i;
  const addressMatch = text.match(addressPattern);

  // Gender extraction - prioritize Male/Female over single letters M/F
  const genderPattern = /\b(Male|Female|MALE|FEMALE)\b/i;
  const genderMatch = text.match(genderPattern) || text.match(/\b(M|F)\b/i);
  let gender = null;
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    gender = (g === 'm' || g === 'male') ? 'male' : (g === 'f' || g === 'female') ? 'female' : null;
  }
  
  return {
    cnic: cnicMatch ? cnicMatch[0].replace(/\s/g, '-') : null,
    name: nameMatch ? nameMatch[1].trim() : null,
    father_name: fatherMatch ? fatherMatch[1].trim() : null,
    date_of_birth: dobMatch ? dobMatch[1].replace(/\s/g, '') : null,
    address: addressMatch ? addressMatch[1].trim() : null,
    gender,
    raw_text: text
  };
};

const extractAcademicData = (text) => {
  const percentagePattern = /(\d+(?:\.\d+)?)\s*%/;
  const percentageMatch = text.match(percentagePattern);
  
  const gradePattern = /Grade[\s:]+([A-F][+-]?)/i;
  const gradeMatch = text.match(gradePattern);
  
  const yearPattern = /(20\d{2})\s*-\s*(20\d{2})/;
  const yearMatch = text.match(yearPattern);
  // Fallback: single year
  const singleYearPattern = /(?:Year|Passing)[\s:]*(20\d{2})/i;
  const singleYearMatch = text.match(singleYearPattern);
  
  const boardPattern = /(BISE\s+[A-Za-z]+|Board of Intermediate[\s\w]*)/i;
  const boardMatch = text.match(boardPattern);
  
  // Roll number extraction
  const rollPattern = /Roll\s*(?:No|Number|#)?[\s:.]+([A-Za-z0-9-]+)/i;
  const rollMatch = text.match(rollPattern);

  // Obtained marks / Total marks extraction
  const marksPattern = /(\d+)\s*(?:out of|\/)\s*(\d+)/i;
  const marksMatch = text.match(marksPattern);
  const obtainedPattern = /(?:Obtained|Marks Obtained)[\s:]*(\d+)/i;
  const obtainedMatch = text.match(obtainedPattern);
  const totalPattern = /(?:Total Marks|Maximum Marks|Out of)[\s:]*(\d+)/i;
  const totalMatch = text.match(totalPattern);

  const subjectPatterns = {
    'Physics': /Physics[\s:]+(\d+)/i,
    'Chemistry': /Chemistry[\s:]+(\d+)/i,
    'Biology': /Biology[\s:]+(\d+)/i,
    'Mathematics': /Mathematics[\s:]+(\d+)/i,
    'Computer Science': /Computer[\s:]+(\d+)/i,
    'English': /English[\s:]+(\d+)/i,
    'Urdu': /Urdu[\s:]+(\d+)/i,
    'Pakistan Studies': /Pakistan Studies[\s:]+(\d+)/i,
    'Islamic Studies': /Islamic Studies[\s:]+(\d+)/i
  };
  
  const subjectScores = {};
  Object.entries(subjectPatterns).forEach(([subject, pattern]) => {
    const match = text.match(pattern);
    if (match) {
      subjectScores[subject] = parseInt(match[1]);
    }
  });
  
  return {
    percentage: percentageMatch ? parseFloat(percentageMatch[1]) : null,
    grade: gradeMatch ? gradeMatch[1] : null,
    passing_year: yearMatch ? yearMatch[2] : (singleYearMatch ? singleYearMatch[1] : null),
    board: boardMatch ? boardMatch[1] : null,
    roll_number: rollMatch ? rollMatch[1] : null,
    obtained_marks: marksMatch ? parseInt(marksMatch[1]) : (obtainedMatch ? parseInt(obtainedMatch[1]) : null),
    total_marks: marksMatch ? parseInt(marksMatch[2]) : (totalMatch ? parseInt(totalMatch[1]) : null),
    subject_scores: subjectScores,
    raw_text: text
  };
};

router.post('/extract', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const { document_type } = req.body;
    const imageBuffer = req.file.buffer;

    let extractedText = '';
    let confidence = 0;
    
    try {
      const result = await Tesseract.recognize(
        imageBuffer,
        'eng',
        {
          logger: m => console.log(m)
        }
      );
      extractedText = result?.data?.text || '';
      confidence = result?.data?.confidence || 0;
    } catch (tesseractError) {
      console.error('Tesseract error:', tesseractError);
      return res.status(500).json({ error: 'OCR processing failed' });
    }

    let extractedData;
    if (document_type === 'cnic') {
      extractedData = extractCNICData(extractedText);
    } else if (document_type === 'academic') {
      extractedData = extractAcademicData(extractedText);
    } else {
      extractedData = {
        raw_text: extractedText,
        cnic: extractCNICData(extractedText).cnic,
        academic: extractAcademicData(extractedText)
      };
    }

    res.json({
      message: 'Document processed successfully',
      extracted_data: extractedData,
      confidence: confidence
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

router.post('/verify-cnic', async (req, res) => {
  try {
    const { cnic, name } = req.body;

    const isValid = cnic && name && cnic.length === 13;

    res.json({
      valid: isValid,
      message: isValid ? 'CNIC verified successfully' : 'CNIC verification failed'
    });
  } catch (error) {
    console.error('CNIC verification error:', error);
    res.status(500).json({ error: 'Failed to verify CNIC' });
  }
});

router.get('/my-documents', async (req, res) => {
  try {
    // Return empty array since we don't have document storage without database
    res.json({ documents: [] });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
