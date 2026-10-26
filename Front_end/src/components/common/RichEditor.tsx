import React, { useRef, useCallback, useEffect } from 'react';

interface RichEditorProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type FormatCommand =
  | 'bold' | 'italic' | 'underline' | 'strikeThrough'
  | 'insertOrderedList' | 'insertUnorderedList'
  | 'formatBlock' | 'justifyLeft' | 'justifyCenter' | 'justifyRight'
  | 'createLink' | 'removeFormat';

const TOOLBAR: Array<{
  icon: string;
  cmd: FormatCommand;
  arg?: string;
  title: string;
}> = [
  { icon: 'B', cmd: 'bold', title: 'In đậm (Ctrl+B)' },
  { icon: 'I', cmd: 'italic', title: 'In nghiêng (Ctrl+I)' },
  { icon: 'U', cmd: 'underline', title: 'Gạch chân (Ctrl+U)' },
  { icon: 'S', cmd: 'strikeThrough', title: 'Gạch ngang' },
  { icon: 'H1', cmd: 'formatBlock', arg: 'h1', title: 'Tiêu đề 1' },
  { icon: 'H2', cmd: 'formatBlock', arg: 'h2', title: 'Tiêu đề 2' },
  { icon: 'H3', cmd: 'formatBlock', arg: 'h3', title: 'Tiêu đề 3' },
  { icon: '¶', cmd: 'formatBlock', arg: 'p', title: 'Đoạn văn' },
  { icon: '≡', cmd: 'insertUnorderedList', title: 'Danh sách dấu đầu dòng' },
  { icon: '①', cmd: 'insertOrderedList', title: 'Danh sách số' },
  { icon: '←', cmd: 'justifyLeft', title: 'Căn trái' },
  { icon: '↔', cmd: 'justifyCenter', title: 'Căn giữa' },
  { icon: '→', cmd: 'justifyRight', title: 'Căn phải' },
  { icon: '⌫', cmd: 'removeFormat', title: 'Xóa định dạng' },
];

const RichEditor: React.FC<RichEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết...',
  minHeight = 320,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Push external `value` into the DOM (only if different, to avoid cursor jump)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isUpdatingRef.current) return;
    if (el.innerHTML !== (value ?? '')) {
      el.innerHTML = value ?? '';
    }
  }, [value]);

  const exec = useCallback((cmd: FormatCommand, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    const html = editorRef.current?.innerHTML ?? '';
    onChange?.(html);
  }, [onChange]);

  const handleInput = useCallback(() => {
    isUpdatingRef.current = true;
    const html = editorRef.current?.innerHTML ?? '';
    onChange?.(html);
    // Allow next useEffect cycle to not overwrite
    setTimeout(() => { isUpdatingRef.current = false; }, 0);
  }, [onChange]);

  const handleLink = useCallback(() => {
    const url = prompt('Nhập URL:');
    if (url) exec('createLink', url);
  }, [exec]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab inserts spaces instead of leaving the editor
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  }, []);

  return (
    <div className="rich-editor-wrapper" style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        padding: '6px 8px',
        background: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0',
      }}>
        {TOOLBAR.map((btn) => (
          <button
            key={btn.icon + btn.cmd}
            type="button"
            title={btn.title}
            onMouseDown={(e) => {
              e.preventDefault(); // keep focus in editor
              exec(btn.cmd, btn.arg);
            }}
            style={{
              minWidth: 32,
              height: 32,
              padding: '0 6px',
              border: '1px solid #d0d0d0',
              borderRadius: 4,
              background: '#fff',
              cursor: 'pointer',
              fontSize: btn.icon.length > 1 ? 11 : 14,
              fontWeight: btn.cmd === 'bold' ? 800 : 600,
              fontStyle: btn.cmd === 'italic' ? 'italic' : 'normal',
              textDecoration: btn.cmd === 'underline' ? 'underline' : btn.cmd === 'strikeThrough' ? 'line-through' : 'none',
              color: '#333',
              lineHeight: '30px',
            }}
          >
            {btn.icon}
          </button>
        ))}

        {/* Link button */}
        <button
          type="button"
          title="Thêm liên kết"
          onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
          style={{
            minWidth: 32, height: 32, padding: '0 8px',
            border: '1px solid #d0d0d0', borderRadius: 4,
            background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1890ff',
          }}
        >
          🔗
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '16px 20px',
          outline: 'none',
          color: '#1f2937',
          fontSize: 15,
          lineHeight: 1.8,
          backgroundColor: '#fff',
          overflowY: 'auto',
        }}
        className="rich-editor-area"
      />

      <style>{`
        .rich-editor-area:empty:before {
          content: attr(data-placeholder);
          color: #bbb;
          pointer-events: none;
        }
        .rich-editor-area h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; color: #111; }
        .rich-editor-area h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; color: #222; }
        .rich-editor-area h3 { font-size: 1.17em; font-weight: 600; margin: 0.83em 0; color: #333; }
        .rich-editor-area p  { margin: 0.5em 0; }
        .rich-editor-area ul { list-style: disc; padding-left: 1.5em; }
        .rich-editor-area ol { list-style: decimal; padding-left: 1.5em; }
        .rich-editor-area a  { color: #C6A96B; text-decoration: underline; }
        .rich-editor-area b, .rich-editor-area strong { font-weight: 700; }
      `}</style>
    </div>
  );
};

export default RichEditor;
