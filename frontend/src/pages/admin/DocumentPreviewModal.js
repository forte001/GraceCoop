import React, { useState, useEffect } from 'react';
import { 
  FaTimes, FaDownload, FaExpand, FaCompress, 
  FaFilePdf, FaFileImage, FaFileAlt 
} from 'react-icons/fa';
import axiosAdminInstance from '../../utils/axiosAdminInstance';
import '../../styles/admin/AdminDocumentInterface.css'

const DocumentPreviewModal = ({ document, isOpen, onClose, onReview }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset states when modal opens/closes or document changes
  useEffect(() => {
    if (isOpen && document) {
      setImageLoaded(false);
      setImageError(false);
      setPdfError(false);
      setSignedUrl(null);
      
      // If using Supabase and need signed URLs for private buckets
      if (document.file_url && document.file_url.includes('supabase')) {
        getSignedUrl();
      } else {
        setSignedUrl(document.file_url);
      }
    }
  }, [isOpen, document]);

  const getSignedUrl = async () => {
    if (!document) return;
    
    try {
      setLoading(true);
      console.log('Getting signed URL for document:', document.id);
      console.log('Document file_url:', document.file_url);
      
      // Get signed URL from your DocumentRequestViewSet
      const response = await axiosAdminInstance.get(`document-requests/${document.id}/signed-url/`);
      console.log('Signed URL response:', response.data);
      
      const finalUrl = response.data.signed_url || document.file_url;
      console.log('Final URL to use:', finalUrl);
      setSignedUrl(finalUrl);
    } catch (error) {
      console.warn('Failed to get signed URL, using direct URL:', error);
      console.log('Fallback to file_url:', document.file_url);
      setSignedUrl(document.file_url);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  const getFileExtension = (filename) => {
    return filename?.split('.').pop()?.toLowerCase() || '';
  };

  const getFileIcon = (filename) => {
    const ext = getFileExtension(filename);
    if (['pdf'].includes(ext)) return <FaFilePdf />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FaFileImage />;
    return <FaFileAlt />;
  };

  const canPreview = (filename) => {
    const ext = getFileExtension(filename);
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const isPDF = (filename) => {
    return getFileExtension(filename) === 'pdf';
  };

  const isImage = (filename) => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      
      // Try authenticated download first
      const response = await axiosAdminInstance.get(`document-requests/${document.id}/download/`, {
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.document_file?.split('/').pop() || `document_${document.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Authenticated download failed:', error);
      
      // Fallback: try direct URL download
      try {
        const urlToUse = signedUrl || document.file_url;
        const response = await fetch(urlToUse);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = document.document_file?.split('/').pop() || `document_${document.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error('Direct download also failed:', fallbackError);
        // Final fallback - open in new tab
        window.open(signedUrl || document.file_url, '_blank');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePdfError = () => {
    setPdfError(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const currentUrl = signedUrl || document.file_url;

  return (
    <div className={`preview-modal-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="preview-modal-content">
        {/* Header */}
        <div className="preview-header">
          <div className="document-info">
            <div className="file-icon">
              {getFileIcon(document.document_file)}
            </div>
            <div className="file-details">
              <h3>{document.document_type_display}</h3>
              <p className="member-name">
                {document.member?.user?.first_name} {document.member?.user?.last_name}
              </p>
              <div className="file-meta">
                <span className="file-size">
                  {document.file_size_mb ? `${document.file_size_mb} MB` : 'Size unknown'}
                </span>
                <span className="upload-date">
                  Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="action-btn" 
              onClick={handleDownload}
              disabled={loading}
              title="Download"
            >
              <FaDownload />
            </button>
            {canPreview(document.document_file) && (
              <button 
                className="action-btn" 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <FaCompress /> : <FaExpand />}
              </button>
            )}
            <button 
              className="action-btn close-btn" 
              onClick={onClose}
              title="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Document Status */}
        <div className="document-status-bar">
          <div className={`status-indicator status-${document.status}`}>
            <span className="status-dot"></span>
            {document.status_display}
          </div>
          {document.status === 'rejected' && document.rejection_reason && (
            <div className="rejection-reason">
              <strong>Rejection Reason:</strong> {document.rejection_reason}
            </div>
          )}
          {document.notes && (
            <div className="review-notes">
              <strong>Notes:</strong> {document.notes}
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="preview-area">
          {loading && (
            <div className="preview-loading">
              <div className="loading-spinner"></div>
              <p>Loading preview...</p>
            </div>
          )}

          {!loading && canPreview(document.document_file) && currentUrl ? (
            <>
              {isPDF(document.document_file) && (
                <div className="pdf-container">
                  {!pdfError ? (
                    <iframe
                      src={`${currentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      width="100%"
                      height="100%"
                      title="PDF Preview"
                      onLoad={() => console.log('PDF iframe loaded successfully')}
                      onError={(e) => {
                        console.error('PDF iframe error:', e);
                        handlePdfError();
                      }}
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <div className="pdf-error">
                      <FaFilePdf size={48} />
                      <h4>PDF Preview Unavailable</h4>
                      <p>Unable to display PDF in browser. This might be due to CORS restrictions.</p>
                      <p><small>URL attempted: {currentUrl}</small></p>
                      <div className="error-actions">
                        <button className="btn-primary" onClick={handleDownload}>
                          <FaDownload /> Download PDF
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => window.open(currentUrl, '_blank')}
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {isImage(document.document_file) && (
                <div className="image-container">
                  {!imageLoaded && !imageError && (
                    <div className="image-loading">
                      <div className="loading-spinner"></div>
                      <p>Loading image...</p>
                    </div>
                  )}
                  
                  {imageError && (
                    <div className="image-error">
                      <FaFileImage size={48} />
                      <h4>Image Preview Unavailable</h4>
                      <p>Failed to load image. This might be due to access restrictions.</p>
                      <div className="error-actions">
                        <button className="btn-primary" onClick={handleDownload}>
                          <FaDownload /> Download Image
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => window.open(currentUrl, '_blank')}
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <img
                    src={currentUrl}
                    alt={document.document_type_display}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ 
                      display: imageLoaded && !imageError ? 'block' : 'none',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                    className="preview-image"
                  />
                </div>
              )}
            </>
          ) : !loading && (
            <div className="no-preview">
              <div className="no-preview-content">
                {getFileIcon(document.document_file)}
                <h4>Preview not available</h4>
                <p>This file type cannot be previewed in the browser.</p>
                <button className="btn-primary" onClick={handleDownload} disabled={loading}>
                  <FaDownload /> Download to view
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {document.status === 'pending' && onReview && (
          <div className="preview-actions">
            <div className="quick-actions">
              <button 
                className="btn-success"
                onClick={() => onReview(document, 'approve')}
                disabled={loading}
              >
                Approve Document
              </button>
              <button 
                className="btn-danger"
                onClick={() => onReview(document, 'reject')}
                disabled={loading}
              >
                Reject Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreviewModal;