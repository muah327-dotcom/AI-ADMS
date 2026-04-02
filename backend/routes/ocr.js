import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { supabase } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

const extractCNICData = (text) => {
  const cnicPattern = /\d{5}-\d{7}-\d/;
  const cnicMatch = text.match(cnicPattern);
  
  const namePattern = /Name[\s:]+([A-Za-z\s]+)/i;
  const nameMatch = text.match(namePattern);
  
  const fatherPattern = /Father[\s:]+([A-Za-z\s]+)/i;
  const fatherMatch = text.match(fatherPattern);
  
  const dobPattern = /Date of Birth[\s:]+(\d{2}[/-]\d{2}[/-]\d{4})/i;
  const dobMatch = text.match(dobPattern);
  
  const addressPattern = /Address[\s:]+([A-Za-z0-9\s,]+)/i;
  const addressMatch = text.match(addressPattern);
  
  return {
    cnic: cnicMatch ? cnicMatch[0] : null,
    name: nameMatch ? nameMatch[1].trim() : null,
    father_name: fatherMatch ? fatherMatch[1].trim() : null,
    date_of_birth: dobMatch ? dobMatch[1] : null,
    address: addressMatch ? addressMatch[1].trim() : null,
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
  
  const boardPattern = /(BISE\s+[A-Za-z]+|Board of Intermediate)/i;
  const boardMatch = text.match(boardPattern);
  
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
    passing_year: yearMatch ? yearMatch[2] : null,
    board: boardMatch ? boardMatch[1] : null,
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

    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    const extractedText = result.data.text;
    
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

    const { data: savedDoc, error } = await supabase
      .from('extracted_documents')
      .insert([{
        user_id: req.user.id,
        document_type,
        extracted_data: extractedData,
        raw_text: extractedText,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) console.error('Save document error:', error);

    res.json({
      message: 'Document processed successfully',
      extracted_data: extractedData,
      confidence: result.data.confidence,
      document_id: savedDoc?.id
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

router.post('/verify-cnic', async (req, res) => {
  try {
    const { cnic, name } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('cnic', cnic)
      .neq('id', req.user.id)
      .single();

    if (user) {
      return res.status(400).json({
        verified: false,
        error: 'CNIC already registered with another account'
      });
    }

    const cnicPattern = /^\d{5}-\d{7}-\d$/;
    const isValidFormat = cnicPattern.test(cnic);

    res.json({
      verified: isValidFormat,
      cnic,
      name,
      message: isValidFormat ? 'CNIC format is valid' : 'Invalid CNIC format'
    });
  } catch (error) {
    console.error('CNIC verification error:', error);
    res.status(500).json({ error: 'Failed to verify CNIC' });
  }
});

router.get('/my-documents', async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('extracted_documents')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ documents });
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
