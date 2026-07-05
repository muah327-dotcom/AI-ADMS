import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { authenticateToken } from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authenticateToken);

/**
 * Clean OCR text by removing common noise characters
 */
const cleanOcrText = (text) => {
  return text
    .replace(/[^\x00-\x7F\s]/g, ' ')   // Remove non-ASCII (Urdu chars etc.)
    .replace(/\r\n/g, '\n')             // Normalize line endings
    .replace(/[ \t]+/g, ' ')            // Collapse multiple spaces/tabs
    .replace(/\n{3,}/g, '\n\n')         // Collapse excessive newlines
    .trim();
};

/**
 * Extract CNIC data using multiple strategies for robustness
 */
/**
 * Helper to fix common OCR digit-to-letter misreads
 */
const fixOcrDigits = (str) => {
  return str
    .replace(/O/gi, '0')
    .replace(/[Il]/g, '1')
    .replace(/S/gi, '5')
    .replace(/B/g, '8')
    .replace(/Z/gi, '2');
};

/**
 * Score a name candidate to prioritize valid multi-word names and penalize OCR noise
 */
const getCandidateScore = (nameStr) => {
  const words = nameStr.split(/\s+/).filter(w => w.length > 0);
  let score = nameStr.length;
  if (words.length >= 2) score += 20;

  const hasSingleCharWord = words.some(w => w.length === 1);
  if (hasSingleCharWord) score -= 15;

  if (words.length === 1 && nameStr.length <= 4) score -= 30;
  if (/^(Nal|Nam|Nom|Nene|Namo)$/i.test(nameStr)) score -= 50;
  return score;
};

/**
 * Clean, score, and select the best candidate from a list of strings
 */
const cleanAndScoreCandidates = (candidates) => {
  if (!candidates || candidates.length === 0) return null;

  const scored = candidates
    .map(c => {
      let clean = c.trim().replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').trim();
      // Remove leading short OCR noise fragments (1-2 char garbage before real name)
      clean = clean.replace(/^[A-Za-z]{1,2}\s+(?=[A-Z])/, '').trim();
      return {
        original: c,
        clean: clean,
        score: getCandidateScore(clean)
      };
    })
    .filter(item => {
      if (item.clean.length < 3) return false;
      if (/^(Nal|Nam|Nom|Nene|Namo|Card|Holder|Father|Husband|Date|Gender|Sex|Country|Expiry|Issue|National|Republic)$/i.test(item.clean)) {
        return false;
      }
      return true;
    });

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].clean;
};

/**
 * Extract CNIC data using multiple strategies for robustness
 */
const extractCNICData = (rawText) => {
  const text = rawText || '';
  const cleanText = cleanOcrText(text);
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('--- OCR Raw Text ---');
  console.log(rawText);
  console.log('--- OCR Clean Text ---');
  console.log(cleanText);
  console.log('--- OCR Lines ---');
  lines.forEach((l, i) => console.log(`  [${i}]: "${l}"`));

  // ===== 1. CNIC Number (Robust) =====
  let cnic = null;
  const robustCnicPattern = /\b([0-9OolISB]{5})[-\s]?([0-9OolISB]{7})[-\s]?([0-9OolISB])\b/i;
  const cnicMatch = cleanText.match(robustCnicPattern);
  if (cnicMatch) {
    const part1 = fixOcrDigits(cnicMatch[1]);
    const part2 = fixOcrDigits(cnicMatch[2]);
    const part3 = fixOcrDigits(cnicMatch[3]);
    cnic = `${part1}-${part2}-${part3}`;
  }

  // ===== 2. Name (Robust Unified) =====
  let name = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Name|Narne|Namo|Nene|Holder|Card|Nal)/i.test(line) && !/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex)/i.test(line)) {
      const candidates = [];
      const sameLineMatch = line.match(/(?:Name|Narne|Namo|Nene|Holder|Card|Nal)\s*[^A-Za-z]*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        candidates.push(sameLineMatch[1]);
      }
      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) {
          break;
        }
        candidates.push(nextLine);
      }
      name = cleanAndScoreCandidates(candidates);
      if (name) break;
    }
  }

  // ===== 3. Father / Husband Name (Robust Unified) =====
  let fatherName = null;
  let fatherLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|F[ao]th|Husb)/i.test(line) && !/(?:Date|Birth|CNIC|Identity|Gender|Sex)/i.test(line)) {
      fatherLineIndex = i;
      const candidates = [];
      const sameLineMatch = line.match(/(?:Father|Husband|Fathor|Fathar|Falher|Fathsr|Fatner|Fathe|F[ao]th|Husb)(?:[\s']*(?:Name|Narne|Namo))?\s*[^A-Za-z]*(.+)$/i);
      if (sameLineMatch && sameLineMatch[1]) {
        candidates.push(sameLineMatch[1]);
      }
      for (let j = 1; j <= 3; j++) {
        const nextLine = lines[i + j];
        if (!nextLine) break;
        if (/(?:Father|Husband|Mother|Date|Birth|CNIC|Identity|Gender|Sex|Country|Expiry|Issue|Card|National)/i.test(nextLine)) {
          break;
        }
        candidates.push(nextLine);
      }
      fatherName = cleanAndScoreCandidates(candidates);
      if (fatherName) break;
    }
  }

  // Fallback: if father name not found, look for lines after the name section
  // that contain a multi-word name-like string (common on Pakistani CNICs where
  // the "Father" label is in Urdu and not recognized by OCR)
  if (!fatherName && name) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip the line that contains the holder's name
      if (line.includes(name)) continue;
      // Skip lines that are clearly labels or contain known fields
      if (/(?:Name|Narne|Namo|Nal|Date|Birth|Gender|Sex|CNIC|Identity|Country|Expiry|Issue|Card|National|Address|Republic)/i.test(line)) continue;
      // Skip lines that look like CNIC numbers or dates
      if (/\d{5}-\d{7}-\d/.test(line) || /\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4}/.test(line)) continue;

      const cleanLine = line.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '').replace(/^[A-Za-z]{1,2}\s+(?=[A-Z])/, '').trim();
      const words = cleanLine.split(/\s+/).filter(w => w.length > 1);
      // A valid father name should have 2+ words, all starting with uppercase
      if (words.length >= 2 && words.every(w => /^[A-Z]/.test(w)) && cleanLine !== name) {
        fatherName = cleanLine;
        break;
      }
    }
  }

  // ===== 4. Date of Birth (Robust) =====
  let dateOfBirth = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Date\s*(?:of)?\s*Birth|Birth\s*Date|D\.?O\.?B/i.test(line)) {
      for (let j = 0; j <= 2; j++) {
        const checkLine = lines[i + j];
        if (!checkLine) continue;
        const tokens = checkLine.split(/\s+/);
        for (const token of tokens) {
          const dateMatch = token.match(/\b([0-9OolISB]{1,2})[.\-\/]([0-9OolISB]{1,2})[.\-\/]([0-9OolISB]{4})\b/i);
          if (dateMatch) {
            const day = fixOcrDigits(dateMatch[1]).padStart(2, '0');
            const month = fixOcrDigits(dateMatch[2]).padStart(2, '0');
            const year = fixOcrDigits(dateMatch[3]);
            if (parseInt(day) <= 31 && parseInt(month) <= 12 && parseInt(year) >= 1950 && parseInt(year) <= 2015) {
              dateOfBirth = `${day}/${month}/${year}`;
              break;
            }
          }
        }
        if (dateOfBirth) break;
      }
    }
    if (dateOfBirth) break;
  }

  // ===== 5. Gender (Robust) =====
  let gender = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Gender|Sex/i.test(line)) {
      for (let j = 0; j <= 2; j++) {
        const checkLine = lines[i + j];
        if (!checkLine) continue;
        const tokens = checkLine.split(/[\s/]+/);
        for (const token of tokens) {
          const cleanToken = token.trim().toUpperCase();
          if (cleanToken === 'M' || cleanToken === 'MALE') {
            gender = 'male';
            break;
          } else if (cleanToken === 'F' || cleanToken === 'FEMALE') {
            gender = 'female';
            break;
          }
        }
        if (gender) break;
      }
    }
    if (gender) break;
  }

  // ===== 6. Address =====
  let address = null;
  const addressPatterns = [
    /(?:Address|Addr)\s*[:\-\/\s]+([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
    /(?:Address|Addr)\s*\n\s*([A-Za-z0-9][A-Za-z0-9 ,.\/#\-]{10,})/im,
  ];

  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      address = match[1].trim().replace(/\s*(Country|Expiry|Date).*$/i, '').trim();
      if (address.length < 10) address = null;
      else break;
    }
  }

  const result = {
    cnic,
    name,
    father_name: fatherName,
    date_of_birth: dateOfBirth,
    gender,
    address,
    raw_text: rawText
  };

  console.log('--- Extracted CNIC Data ---');
  console.log(JSON.stringify(result, null, 2));

  return result;
};

const extractAcademicData = (text) => {
  const percentagePattern = /(\d+(?:\.\d+)?)\s*%/;
  const percentageMatch = text.match(percentagePattern);

  const gradePattern = /Grade[\s:]+([A-F][+-]?)/i;
  const gradeMatch = text.match(gradePattern);

  const yearPattern = /(20\d{2})\s*-\s*(20\d{2})/;
  const yearMatch = text.match(yearPattern);
  const singleYearPattern = /(?:Year|Passing)[\s:]*(20\d{2})/i;
  const singleYearMatch = text.match(singleYearPattern);

  const boardPattern = /(BISE\s+[A-Za-z]+|Board of Intermediate[\s\w]*)/i;
  const boardMatch = text.match(boardPattern);

  const rollPattern = /Roll\s*(?:No|Number|#)?[\s:.]+([A-Za-z0-9-]+)/i;
  const rollMatch = text.match(rollPattern);

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

    console.log(`\n=== OCR Request: type=${document_type}, file=${req.file.originalname}, size=${req.file.size} bytes ===`);

    let extractedText = '';
    let confidence = 0;

    try {
      // Use createWorker for more reliable processing with local traineddata
      const worker = await Tesseract.createWorker('eng', 1, {
        langPath: path.join(__dirname, '..'),
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      });

      // Set page segmentation mode to automatic for best results
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });

      const result = await worker.recognize(imageBuffer);
      extractedText = result?.data?.text || '';
      confidence = result?.data?.confidence || 0;

      console.log(`OCR Complete: confidence=${confidence}%, text length=${extractedText.length}`);

      await worker.terminate();
    } catch (tesseractError) {
      console.error('Tesseract error:', tesseractError);
      return res.status(500).json({
        error: 'OCR processing failed',
        details: tesseractError.message
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        error: 'No text could be extracted from the document. Please ensure the image is clear and well-lit.'
      });
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

    // CNIC should be in format XXXXX-XXXXXXX-X (15 chars with dashes)
    const isValidFormat = cnic && /^\d{5}-\d{7}-\d$/.test(cnic);
    const isValid = isValidFormat && name && name.length >= 2;

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
    res.json({ documents: [] });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;

