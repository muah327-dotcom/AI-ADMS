import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CreditCard,
  Award,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Scan,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const DocumentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [documentType, setDocumentType] = useState('cnic');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFile, setProcessingFile] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setProcessingFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setExtractedData(data.extracted_data);
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          type: documentType,
          extractedData: data.extracted_data,
          confidence: data.confidence
        }]);
        toast.success('Document processed successfully!');
      } else {
        toast.error(data.error || 'Failed to process document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error processing document');
    } finally {
      setUploading(false);
      setProcessingFile(null);
    }
  }, [documentType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
      setExtractedData(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Document Upload</h1>
        <p className="text-gray-500 mt-1">Upload your documents for automatic data extraction using OCR</p>
      </div>

      {/* Document Type Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Document Type</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { id: 'cnic', name: 'CNIC / ID Card', icon: CreditCard, desc: 'Identity document' },
            { id: 'academic', name: 'Academic Certificate', icon: Award, desc: 'Matric/FSc/Equivalent' },
            { id: 'other', name: 'Other Document', icon: FileText, desc: 'Additional documents' }
          ].map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setDocumentType(type.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  documentType === type.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-8 w-8 mb-2 ${documentType === type.id ? 'text-primary-600' : 'text-gray-400'}`} />
                <h4 className={`font-medium ${documentType === type.id ? 'text-primary-900' : 'text-gray-900'}`}>
                  {type.name}
                </h4>
                <p className="text-sm text-gray-500">{type.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
            ) : (
              <Scan className="h-8 w-8 text-primary-600" />
            )}
          </div>
          <p className="text-lg font-medium text-gray-900">
            {uploading ? 'Processing document...' : 'Drop your document here'}
          </p>
          <p className="text-gray-500 mt-2">or click to browse</p>
          <p className="text-sm text-gray-400 mt-4">
            Supported formats: PDF, PNG, JPG (max 10MB)
          </p>
          {processingFile && (
            <p className="text-sm text-primary-600 mt-2">
              Processing: {processingFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="bg-white rounded-xl shadow-sm p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">AI Extracted Data</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            {documentType === 'cnic' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {extractedData.cnic && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">CNIC Number</label>
                    <p className="text-gray-900 font-medium">{extractedData.cnic}</p>
                  </div>
                )}
                {extractedData.name && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                    <p className="text-gray-900 font-medium">{extractedData.name}</p>
                  </div>
                )}
                {extractedData.father_name && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Father&apos;s Name</label>
                    <p className="text-gray-900 font-medium">{extractedData.father_name}</p>
                  </div>
                )}
                {extractedData.date_of_birth && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                    <p className="text-gray-900 font-medium">{extractedData.date_of_birth}</p>
                  </div>
                )}
                {extractedData.address && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Address</label>
                    <p className="text-gray-900">{extractedData.address}</p>
                  </div>
                )}
              </div>
            ) : documentType === 'academic' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {extractedData.percentage && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Percentage</label>
                    <p className="text-gray-900 font-medium">{extractedData.percentage}%</p>
                  </div>
                )}
                {extractedData.grade && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Grade</label>
                    <p className="text-gray-900 font-medium">{extractedData.grade}</p>
                  </div>
                )}
                {extractedData.passing_year && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Passing Year</label>
                    <p className="text-gray-900 font-medium">{extractedData.passing_year}</p>
                  </div>
                )}
                {extractedData.board && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Board/University</label>
                    <p className="text-gray-900 font-medium">{extractedData.board}</p>
                  </div>
                )}
                {extractedData.subject_scores && Object.keys(extractedData.subject_scores).length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Subject Scores</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {Object.entries(extractedData.subject_scores).map(([subject, score]) => (
                        <div key={subject} className="bg-white rounded px-3 py-2">
                          <span className="text-sm text-gray-600">{subject}:</span>
                          <span className="text-sm font-medium text-gray-900 ml-2">{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600">
                <p>Document processed. Raw text extracted:</p>
                <pre className="mt-2 p-3 bg-white rounded text-sm overflow-auto max-h-48">
                  {extractedData.raw_text}
                </pre>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Data extracted successfully</span>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{file.type} • Confidence: {file.confidence?.toFixed(1)}%</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Tips for Best Results</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Ensure documents are clear and well-lit</li>
              <li>Make sure all text is readable and not blurry</li>
              <li>Upload the complete document without cropping</li>
              <li>Supported file formats: PDF, PNG, JPG</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
