import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Edit2, FileText, CheckCircle2, XCircle, Eye, ChevronRight, Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { StudentRecord, SubjectResult } from '../types';
import { isStudentPass, getEffectiveStatus } from '../utils/statusHelper';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface StudentDetailModalProps {
  student: StudentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: StudentRecord) => void;
  onDelete: (id: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<StudentRecord | null>(null);
  const [showOriginalImage, setShowOriginalImage] = useState<boolean>(true);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [reanalyzeStatus, setReanalyzeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showRecordDeleteConfirm, setShowRecordDeleteConfirm] = useState<boolean>(false);
  const [subjectToDeleteIndex, setSubjectToDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    if (student) {
      // Deep copy to allow editing draft without mutating original state immediately
      setFormData(JSON.parse(JSON.stringify(student)));
      setReanalyzeStatus(null);
      setIsReanalyzing(false);
    }
  }, [student]);

  if (!isOpen || !formData) return null;

  const handleFieldChange = (field: keyof StudentRecord, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSubjectChange = (index: number, key: keyof SubjectResult, value: string) => {
    if (!formData) return;
    const updatedSubjects = [...formData.subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [key]: value };
    setFormData({ ...formData, subjects: updatedSubjects });
  };

  const handleAddSubject = () => {
    if (!formData) return;
    const newSub: SubjectResult = {
      subjectCode: '',
      subjectName: 'New Subject',
      result: 'PASS',
      totalMarks: '',
    };
    setFormData({ ...formData, subjects: [...formData.subjects, newSub] });
  };

  const handleRemoveSubject = (index: number) => {
    if (!formData) return;
    const updatedSubjects = formData.subjects.filter((_, i) => i !== index);
    setFormData({ ...formData, subjects: updatedSubjects });
  };

  const handleReanalyzeImage = async () => {
    if (!formData?.imageUrl || isReanalyzing) return;

    setIsReanalyzing(true);
    setReanalyzeStatus(null);

    try {
      const response = await fetch('/api/extract-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: formData.imageUrl,
          mimeType: 'image/png',
        }),
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || 'Server returned invalid response');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to re-analyze image');
      }

      const extractedStudents = data.students || [];
      if (extractedStudents.length === 0) {
        throw new Error('No student data could be detected from the image.');
      }

      // Pick matching student or default to first
      const match = extractedStudents.find((s: any) => 
        (s.usn && formData.usn && s.usn.trim().toLowerCase() === formData.usn.trim().toLowerCase()) ||
        (s.name && formData.name && s.name.trim().toLowerCase().includes(formData.name.trim().toLowerCase()))
      ) || extractedStudents[0];

      // Merge student metadata
      setFormData((prev) => {
        if (!prev) return null;

        const mergedUSN = match.usn || prev.usn;
        const mergedName = match.name || prev.name;
        const mergedCollege = match.college || prev.college;
        const mergedSemester = match.semester || prev.semester;
        const mergedSgpa = match.sgpa || prev.sgpa;
        const mergedStatus = match.status || prev.status;

        // Merge subjects intelligently
        const updatedSubjects = [...prev.subjects];
        const extSubjects: SubjectResult[] = match.subjects || [];

        extSubjects.forEach((extSub) => {
          const extCode = (extSub.subjectCode || '').trim().toLowerCase();
          const extName = (extSub.subjectName || '').trim().toLowerCase();

          // Try to match existing subject index
          const matchIdx = updatedSubjects.findIndex((s) => {
            const sCode = (s.subjectCode || '').trim().toLowerCase();
            const sName = (s.subjectName || '').trim().toLowerCase();
            return (extCode && sCode && extCode === sCode) || (extName && sName && (sName.includes(extName) || extName.includes(sName)));
          });

          if (matchIdx !== -1) {
            const existing = updatedSubjects[matchIdx];
            updatedSubjects[matchIdx] = {
              subjectCode: extSub.subjectCode || existing.subjectCode || '',
              subjectName: extSub.subjectName || existing.subjectName || '',
              internalMarks: extSub.internalMarks || existing.internalMarks || '',
              externalMarks: extSub.externalMarks || existing.externalMarks || '',
              totalMarks: extSub.totalMarks || existing.totalMarks || '',
              result: extSub.result || existing.result || 'PASS',
              grade: extSub.grade || existing.grade,
              credits: extSub.credits || existing.credits,
            };
          } else {
            updatedSubjects.push({
              subjectCode: extSub.subjectCode || '',
              subjectName: extSub.subjectName || 'Subject',
              internalMarks: extSub.internalMarks || '',
              externalMarks: extSub.externalMarks || '',
              totalMarks: extSub.totalMarks || '',
              result: extSub.result || 'PASS',
              grade: extSub.grade,
              credits: extSub.credits,
            });
          }
        });

        return {
          ...prev,
          usn: mergedUSN,
          name: mergedName,
          college: mergedCollege,
          semester: mergedSemester,
          sgpa: mergedSgpa,
          status: mergedStatus,
          subjects: updatedSubjects,
        };
      });

      setReanalyzeStatus({
        type: 'success',
        message: 'Image re-analyzed successfully! Updated external marks and missing values.',
      });

      setTimeout(() => {
        setReanalyzeStatus(null);
      }, 5000);

    } catch (err: any) {
      console.error('Re-analyze error:', err);
      setReanalyzeStatus({
        type: 'error',
        message: err.message || 'Failed to re-analyze image.',
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      const finalStatus = getEffectiveStatus(formData);
      onSave({ ...formData, status: finalStatus });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-xs">
              {formData.usn || 'NO USN'}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{formData.name || 'Student Details'}</h2>
              <p className="text-xs text-slate-500">Review and edit extracted student marks card data</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {formData.imageUrl && (
              <>
                <button
                  type="button"
                  onClick={handleReanalyzeImage}
                  disabled={isReanalyzing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Re-scan marks card image with AI to extract missing values or external marks"
                >
                  {isReanalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Re-analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Re-analyze Image</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOriginalImage(!showOriginalImage)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center space-x-1.5 ${
                    showOriginalImage
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showOriginalImage ? 'Hide Screenshot' : 'View Screenshot'}</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Re-analyze status message */}
          {reanalyzeStatus && (
            <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
              reanalyzeStatus.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {reanalyzeStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{reanalyzeStatus.message}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setReanalyzeStatus(null)} 
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Original Screenshot Image */}
            {formData.imageUrl && showOriginalImage && (
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <span>Source Screenshot</span>
                    {isReanalyzing && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
                  </span>
                  <button
                    type="button"
                    onClick={handleReanalyzeImage}
                    disabled={isReanalyzing}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isReanalyzing ? 'Scanning...' : 'Re-analyze'}</span>
                  </button>
                </div>
                <div className="flex-1 min-h-[280px] max-h-[500px] flex items-center justify-center overflow-auto rounded-lg bg-slate-900 border border-slate-200 p-2 relative">
                  <img
                    src={formData.imageUrl}
                    alt="Student Marksheet"
                    className="max-w-full h-auto object-contain rounded"
                  />
                  {isReanalyzing && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4 text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                      <p className="text-xs font-semibold">Re-analyzing image with Gemini AI...</p>
                      <p className="text-[10px] text-slate-300 mt-1">Extracting external marks and subject details</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right / Main Column: Structured Fields & Subjects */}
            <div className={`${formData.imageUrl && showOriginalImage ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-5`}>
              
              {/* Primary Metadata Box */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Student Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">USN / Register Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.usn}
                      onChange={(e) => handleFieldChange('usn', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Student Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">College / Institution</label>
                    <input
                      type="text"
                      value={formData.college || ''}
                      onChange={(e) => handleFieldChange('college', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Semester / Exam</label>
                    <input
                      type="text"
                      value={formData.semester || ''}
                      onChange={(e) => handleFieldChange('semester', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">SGPA / CGPA</label>
                    <input
                      type="text"
                      value={formData.sgpa || ''}
                      onChange={(e) => handleFieldChange('sgpa', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Overall Status</label>
                    <select
                      value={getEffectiveStatus(formData)}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 font-semibold"
                    >
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                      <option value="PROMOTED">PROMOTED</option>
                      <option value="FIRST CLASS">FIRST CLASS</option>
                      <option value="DISTINCTION">DISTINCTION</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subjects Table Editor */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Extracted Subjects ({formData.subjects.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Subject</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 w-28">Subject Code</th>
                        <th className="px-3 py-2 min-w-[150px]">Subject Name</th>
                        <th className="px-3 py-2 w-20">Internal</th>
                        <th className="px-3 py-2 w-20">External</th>
                        <th className="px-3 py-2 w-20">Total</th>
                        <th className="px-3 py-2 w-24">Result</th>
                        <th className="px-3 py-2 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.subjects.map((sub, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.subjectCode || ''}
                              onChange={(e) => handleSubjectChange(idx, 'subjectCode', e.target.value)}
                              placeholder="Code"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.subjectName}
                              onChange={(e) => handleSubjectChange(idx, 'subjectName', e.target.value)}
                              required
                              placeholder="Subject Name"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:border-emerald-600 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.internalMarks || ''}
                              onChange={(e) => handleSubjectChange(idx, 'internalMarks', e.target.value)}
                              placeholder="Int"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:border-emerald-600 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.externalMarks || ''}
                              onChange={(e) => handleSubjectChange(idx, 'externalMarks', e.target.value)}
                              placeholder="Ext"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:border-emerald-600 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.totalMarks || ''}
                              onChange={(e) => handleSubjectChange(idx, 'totalMarks', e.target.value)}
                              placeholder="Total"
                              className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold focus:border-emerald-600 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={sub.result || ''}
                              onChange={(e) => handleSubjectChange(idx, 'result', e.target.value)}
                              required
                              placeholder="PASS / FAIL"
                              className={`w-full px-2 py-1 rounded border font-bold focus:outline-none ${
                                (sub.result || '').toUpperCase().includes('PASS') || sub.result === 'P'
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : (sub.result || '').toUpperCase().includes('FAIL') || sub.result === 'F'
                                  ? 'text-red-700 bg-red-50 border-red-200'
                                  : 'text-amber-700 bg-amber-50 border-amber-200'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSubjectToDeleteIndex(idx)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowRecordDeleteConfirm(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Delete Confirmation Modal for Student Record */}
      <DeleteConfirmModal
        isOpen={showRecordDeleteConfirm}
        title="Delete Student Record?"
        studentName={formData.name}
        usn={formData.usn}
        onConfirm={() => {
          onDelete(formData.id);
          setShowRecordDeleteConfirm(false);
          onClose();
        }}
        onCancel={() => setShowRecordDeleteConfirm(false)}
      />

      {/* Delete Confirmation Modal for Subject Row */}
      <DeleteConfirmModal
        isOpen={subjectToDeleteIndex !== null}
        title="Remove Subject?"
        message={
          subjectToDeleteIndex !== null && formData.subjects[subjectToDeleteIndex]
            ? `Are you sure you want to remove subject "${formData.subjects[subjectToDeleteIndex].subjectName || formData.subjects[subjectToDeleteIndex].subjectCode || 'this subject'}" from this student's record?`
            : "Are you sure you want to remove this subject?"
        }
        onConfirm={() => {
          if (subjectToDeleteIndex !== null) {
            handleRemoveSubject(subjectToDeleteIndex);
            setSubjectToDeleteIndex(null);
          }
        }}
        onCancel={() => setSubjectToDeleteIndex(null)}
      />
    </div>
  );
};
