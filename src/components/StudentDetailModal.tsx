import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Edit2, FileText, CheckCircle2, XCircle, Eye, ChevronRight } from 'lucide-react';
import { StudentRecord, SubjectResult } from '../types';

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

  useEffect(() => {
    if (student) {
      // Deep copy to allow editing draft without mutating original state immediately
      setFormData(JSON.parse(JSON.stringify(student)));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Original Screenshot Image */}
            {formData.imageUrl && showOriginalImage && (
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Source Screenshot</span>
                  <span className="text-[10px] text-slate-400 font-normal">Original AI Input</span>
                </div>
                <div className="flex-1 min-h-[280px] max-h-[500px] flex items-center justify-center overflow-auto rounded-lg bg-slate-900 border border-slate-200 p-2">
                  <img
                    src={formData.imageUrl}
                    alt="Student Marksheet"
                    className="max-w-full h-auto object-contain rounded"
                  />
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
                      value={formData.status || 'PASS'}
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
                              onClick={() => handleRemoveSubject(idx)}
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
              onClick={() => {
                if (confirm('Are you sure you want to delete this student record?')) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
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
    </div>
  );
};
