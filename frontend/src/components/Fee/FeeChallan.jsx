import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Printer,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  Calendar,
  Building,
  DollarSign,
  User,
  ShieldCheck,
  XCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonLoader from '../Common/SkeletonLoader';

const FeeChallan = () => {
  const [challans, setChallans] = useState([]);
  const [selectedChallanIndex, setSelectedChallanIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    fetchFeeChallans();
  }, []);

  const fetchFeeChallans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/merit/my-fee-challan', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallans(data.challans || []);
      }
    } catch (err) {
      console.error('Fetch challans error:', err);
      toast.error('Failed to load fee challan');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUploadReceipt = async (e) => {
    e.preventDefault();
    const currentChallan = challans[selectedChallanIndex];
    if (!currentChallan) return;

    if (!receiptFile && !receiptUrl) {
      toast.error('Please select a file or provide a receipt URL');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');

      // Use simulated image URL or uploaded file URL
      let finalUrl = receiptUrl;
      if (receiptFile && !finalUrl) {
        finalUrl = URL.createObjectURL(receiptFile);
      }

      const res = await fetch(`/api/merit/upload-paid-challan/${currentChallan.application_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receipt_url: finalUrl || 'https://via.placeholder.com/600x800.png?text=Paid+Fee+Challan+Receipt',
          filename: receiptFile?.name || 'paid_fee_challan.pdf'
        })
      });

      if (res.ok) {
        toast.success('Paid fee receipt submitted successfully! Pending admin verification.');
        fetchFeeChallans();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit fee receipt');
      }
    } catch (err) {
      console.error('Upload receipt error:', err);
      toast.error('Error submitting paid receipt');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <SkeletonLoader variant="card" theme="dark" />;
  }

  const currentChallan = challans[selectedChallanIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Print stylesheet to hide sidebar/controls when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-challan, #printable-challan * {
            visibility: visible;
          }
          #printable-challan {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
            <CreditCard className="h-8 w-8 text-primary-600 mr-3" />
            Fee Challan & Payment
          </h1>
          <p className="text-gray-500 mt-1">
            Download your admission fee challan, pay at bank, and upload the paid receipt to confirm your admission.
          </p>
        </div>
        {currentChallan && (
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
          >
            <Printer className="h-5 w-5 mr-2" />
            Print Fee Challan
          </button>
        )}
      </div>

      {/* Program Selector Tabs if multiple programs */}
      {challans.length > 1 && (
        <div className="flex gap-2 border-b border-gray-200 pb-2 no-print">
          {challans.map((ch, idx) => (
            <button
              key={ch.application_id}
              onClick={() => setSelectedChallanIndex(idx)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                idx === selectedChallanIndex
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {ch.program_name}
            </button>
          ))}
        </div>
      )}

      {!currentChallan ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center no-print shadow-sm">
          <CreditCard className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Fee Challan Generated</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Fee challans are generated once you are selected in a merit list. Check the merit list section for your admission status.
          </p>
        </div>
      ) : (
        <>
          {/* Status & Deadline Banner */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 no-print shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-[#999999] text-sm">Program:</span>
                  <span className="font-semibold text-gray-900">{currentChallan.program_name}</span>
                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded font-mono">
                    Merit List #{currentChallan.merit_list_number}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 text-primary-600" />
                  <span>Fee Payment Deadline:</span>
                  <span className="text-yellow-400 font-medium">
                    {new Date(currentChallan.challan.due_date).toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {currentChallan.fee_status === 'verified' || currentChallan.status === 'confirmed' ? (
                  <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-200">
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-semibold text-sm">Admission Confirmed!</p>
                      <p className="text-xs text-green-300">Fee payment verified by university.</p>
                    </div>
                  </div>
                ) : currentChallan.fee_status === 'submitted' ? (
                  <div className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-200">
                    <Clock className="h-5 w-5 mr-2 animate-pulse" />
                    <div>
                      <p className="font-semibold text-sm">Fee Receipt Submitted</p>
                      <p className="text-xs text-yellow-300">Pending admin verification.</p>
                    </div>
                  </div>
                ) : currentChallan.status === 'dropped' ? (
                  <div className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-lg border border-red-200">
                    <XCircle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-semibold text-sm">Admission Dropped</p>
                      <p className="text-xs text-red-300">Deadline passed without fee payment.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center px-4 py-2 bg-primary-100 text-primary-800 rounded-lg border border-primary-200">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-semibold text-sm">Action Required: Unpaid</p>
                      <p className="text-xs text-primary-700">Pay at bank & upload receipt before deadline.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Printable Official Fee Challan (3-Copy Layout) */}
          <div id="printable-challan" className="bg-white text-gray-900 rounded-xl p-6 shadow-2xl border border-gray-300">
            {/* Challan Title Banner */}
            <div className="text-center border-b-2 border-gray-900 pb-3 mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider text-gray-900">University Admission Office</h2>
              <p className="text-xs font-semibold text-gray-700">Official Bank Challan for Admission Fee Deposit</p>
              <p className="text-xs text-gray-500">Deposit in any online branch of {currentChallan.challan.bank_name}</p>
            </div>

            {/* 3 Copy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-400">
              {['Bank Copy', 'University Copy', 'Student Copy'].map((copyName, cIdx) => (
                <div key={copyName} className={`${cIdx > 0 ? 'pt-4 md:pt-0 md:pl-4' : ''} text-xs space-y-3`}>
                  {/* Copy Header */}
                  <div className="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-300">
                    <span className="font-bold text-gray-900 uppercase tracking-wide">{copyName}</span>
                    <span className="font-mono text-gray-700 font-semibold">{currentChallan.challan.challan_number}</span>
                  </div>

                  {/* Bank & Account Info */}
                  <div className="bg-primary-50 p-2 rounded border border-primary-200">
                    <p className="font-bold text-primary-900">{currentChallan.challan.bank_name}</p>
                    <p className="text-gray-700">A/C Title: <span className="font-medium text-gray-900">{currentChallan.challan.account_title}</span></p>
                    <p className="text-gray-700 font-mono">A/C No: <span className="font-bold text-gray-900">{currentChallan.challan.account_number}</span></p>
                  </div>

                  {/* Student Particulars */}
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-1 font-semibold text-gray-600">App ID / Student:</td>
                        <td className="py-1 font-bold text-gray-900">{currentChallan.student.full_name}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1 font-semibold text-gray-600">Father Name:</td>
                        <td className="py-1 text-gray-800">{currentChallan.student.father_name || 'N/A'}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1 font-semibold text-gray-600">CNIC:</td>
                        <td className="py-1 font-mono text-gray-800">{currentChallan.student.cnic}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1 font-semibold text-gray-600">Program:</td>
                        <td className="py-1 font-bold text-primary-800">{currentChallan.program_name}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1 font-semibold text-gray-600">Due Date:</td>
                        <td className="py-1 font-bold text-red-600">
                          {new Date(currentChallan.challan.due_date).toLocaleDateString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Fee Breakdown Table */}
                  <div className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-gray-200 px-2 py-1 font-bold text-gray-800 text-[11px] flex justify-between">
                      <span>Particulars</span>
                      <span>Amount (PKR)</span>
                    </div>
                    <div className="divide-y divide-gray-200">
                      <div className="px-2 py-1 flex justify-between text-gray-700">
                        <span>Admission Fee</span>
                        <span>Rs. {currentChallan.challan.admission_fee.toLocaleString()}</span>
                      </div>
                      <div className="px-2 py-1 flex justify-between text-gray-700">
                        <span>Semester Tuition Fee</span>
                        <span>Rs. {currentChallan.challan.tuition_fee.toLocaleString()}</span>
                      </div>
                      <div className="px-2 py-1 flex justify-between font-bold bg-gray-100 text-gray-900">
                        <span>Total Payable</span>
                        <span className="text-primary-900">Rs. {currentChallan.challan.total_fee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stamp & Signatures Mockup */}
                  <div className="pt-4 flex justify-between items-end text-[10px] text-gray-500">
                    <div className="border-t border-gray-400 pt-1 text-center w-24">
                      Bank Officer
                    </div>
                    <div className="border-t border-gray-400 pt-1 text-center w-24">
                      Depositor Sign
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Notice */}
            <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[10px] text-gray-500">
              Note: Non-refundable fee. Payments must be submitted via bank stamp and receipt uploaded online before due date.
            </div>
          </div>

          {/* Upload Paid Fee Receipt Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 no-print space-y-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <Upload className="h-6 w-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Upload Paid Fee Receipt</h3>
                <p className="text-sm text-gray-500">
                  After paying at the bank, upload a scan/photo of your bank-stamped challan receipt here.
                </p>
              </div>
            </div>

            {currentChallan.challan.paid_receipt_url && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Uploaded Receipt</p>
                    <p className="text-xs text-gray-500">
                      Uploaded on {new Date(currentChallan.challan.uploaded_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={currentChallan.challan.paid_receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-primary-100 text-primary-800 text-xs font-semibold rounded hover:bg-primary-200 transition-colors"
                >
                  View Receipt
                </a>
              </div>
            )}

            <form onSubmit={handleUploadReceipt} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Receipt Image / PDF File</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 bg-white border border-gray-300 rounded-lg p-2.5 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or Provide Image/File URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/paid-receipt.pdf"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-primary-500 outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || currentChallan.status === 'dropped'}
                className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Submitting Receipt...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Submit Paid Receipt
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default FeeChallan;
