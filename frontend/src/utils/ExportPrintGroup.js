import React, { useState, useRef, useEffect } from 'react';

function ExportPrintGroup({ data, exportToExcel, exportToPDF, exportToCSV}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const disabled = !data.length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        style={{
          padding: '6px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        title="Export or Print options"
      >
        Export ▾
      </button>

      {open && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            padding: 0,
            listStyle: 'none',
            border: '1px solid #ccc',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            width: 140,
          }}
        >
          <li>
            <button
              onClick={() => {
                exportToExcel();
                setOpen(false);
              }}
              style={dropdownButtonStyle}
              disabled={disabled}
            >
              Export to Excel
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                exportToPDF();
                setOpen(false);
              }}
              style={dropdownButtonStyle}
              disabled={disabled}
            >
              Export to PDF
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                exportToCSV();
                setOpen(false);
              }}
              style={dropdownButtonStyle}
              disabled={disabled}
            >
              Export to CSV
            </button>
          </li>
          
        </ul>
      )}
    </div>
  );
}

const dropdownButtonStyle = {
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 14,
  color: '#333',
};

export default ExportPrintGroup;
