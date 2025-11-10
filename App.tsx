
import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- CONFIGURATION ---
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_COMPRESS_SIZE_BYTES = 10 * 1024; // 10 KB

// --- TYPE DEFINITIONS ---
type Step = 'upload' | 'configure' | 'processing' | 'success' | 'error';
type Mode = 'compress' | 'inflate';
type ModalType = 'terms' | 'privacy' | 'contact' | 'donate';

interface OutputFile {
    blob: Blob;
    name: string;
    originalSize: number;
}

// --- UTILITY & HELPER FUNCTIONS ---
const formatBytesSimple = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0.0 KB / 0.00 MB';
  const k = 1024;
  const kb = bytes / k;
  const mb = kb / k;
  return `${kb.toFixed(1)} KB / ${mb.toFixed(2)} MB`;
};

// --- ICONS ---
// Fix: Added quotes to SVG attributes to treat them as strings instead of variables.
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
const FileIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>;
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const Spinner: React.FC<{ className?: string }> = ({ className }) => <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const ScissorsIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>;
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>;
const ZapIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>;
const XIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const MenuIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;

// --- DECORATIONS ---
const HeroDecorations = () => (
    <>
        <div className="absolute top-[10%] left-[20%] w-1.5 h-1.5 bg-[#9DB0A2]/50 rounded-full opacity-0 md:opacity-100" />
        <div className="absolute top-[15%] right-[5%] w-1 h-1 bg-[#9DB0A2]/50 rounded-full" />
        <div className="absolute top-[50%] left-[5%] w-2 h-2 bg-[#9DB0A2]/50 rounded-full opacity-0 md:opacity-100" />
        <div className="absolute top-[80%] right-[10%] w-1.5 h-1.5 bg-[#9DB0A2]/50 rounded-full opacity-0 md:opacity-100" />
        <div className="absolute bottom-[5%] left-[30%] w-1 h-1 bg-[#9DB0A2]/50 rounded-full" />
        <div className="absolute bottom-[10%] right-[40%] w-2 h-2 bg-[#9DB0A2]/50 rounded-full" />
        
        <div className="absolute top-[8%] left-[8%] h-32 w-px bg-[#9DB0A2]/60 hidden lg:block">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className={`absolute w-2 h-px bg-current ${i % 4 === 0 ? '-left-2 w-4' : '-left-1'}`} style={{ top: `${i * 1}rem` }}/>)}
        </div>
        <div className="absolute top-[15%] right-[8%] h-48 w-px bg-[#9DB0A2]/60 hidden lg:block">
            {Array.from({ length: 13 }).map((_, i) => <div key={i} className={`absolute w-2 h-px bg-current ${i % 4 === 0 ? '-right-2 w-4' : '-right-1'}`} style={{ top: `${i * 1}rem` }}/>)}
        </div>
    </>
);


// --- UI COMPONENTS ---
const UploadStep: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onFileSelect(file);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div 
            className="w-full text-center p-8 border-2 border-dashed border-[#9DB0A2]/80 dark:border-[#9DB0A2]/60 rounded-xl cursor-pointer hover:border-[#9DB0A2] dark:hover:border-[#9DB0A2] transition-all duration-300 bg-transparent"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <UploadIcon className="mx-auto h-8 w-8 text-[#3A3A3A]/70 dark:text-[#F9F7F3]/70 mb-4" />
            <h3 className="text-lg font-semibold text-current">Drop a File Here to Start Measuring</h3>
            <p className="text-current/60 mt-1 text-sm">Or click to select a file</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
    );
};

const ConfigureStep: React.FC<{ file: File; onProcess: (mode: Mode, options: any) => void; onCancel: () => void; }> = ({ file, onProcess, onCancel }) => {
    const isImage = COMPRESSIBLE_IMAGE_TYPES.includes(file.type);
    const isCompressible = isImage && file.size > MIN_COMPRESS_SIZE_BYTES;
    const [mode, setMode] = useState<Mode>(isCompressible ? 'compress' : 'inflate');
    
    const originalSizeKb = file.size / 1024;
    const sliderMin = mode === 'compress' ? MIN_COMPRESS_SIZE_BYTES / 1024 : Math.ceil(originalSizeKb);
    const sliderMax = mode === 'compress' ? Math.floor(originalSizeKb) : MAX_FILE_SIZE_BYTES / 1024;

    const getInitialTargetKb = useCallback(() => {
        return mode === 'compress'
            ? Math.max(sliderMin, Math.round(originalSizeKb / 2))
            : Math.round(originalSizeKb) + 100;
    }, [mode, originalSizeKb, sliderMin]);

    const [targetSizeKb, setTargetSizeKb] = useState(getInitialTargetKb);
    const [kbInput, setKbInput] = useState(() => String(getInitialTargetKb()));

    useEffect(() => {
        const newTargetKb = getInitialTargetKb();
        setTargetSizeKb(newTargetKb);
    }, [mode, getInitialTargetKb]);

    useEffect(() => {
        if (Math.round(parseFloat(kbInput)) !== Math.round(targetSizeKb)) {
            setKbInput(String(Math.round(targetSizeKb)));
        }
    }, [targetSizeKb, kbInput]);
    
    const handleKbInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKbInput(e.target.value);
        const numValue = parseFloat(e.target.value);
        if (!isNaN(numValue) && numValue >= sliderMin && numValue <= sliderMax) {
            setTargetSizeKb(numValue);
        }
    };

    const handleKbInputBlur = () => {
        const numValue = parseFloat(kbInput);
        let finalValue;
        if (isNaN(numValue)) {
            finalValue = sliderMin;
        } else {
            finalValue = Math.max(sliderMin, Math.min(sliderMax, numValue));
        }
        setTargetSizeKb(finalValue);
        setKbInput(String(Math.round(finalValue)));
    };
    
    const handleProcess = () => {
        onProcess(mode, { targetSize: targetSizeKb * 1024 });
    };

    return (
        <div className="w-full p-6 bg-[#F9F7F3]/80 dark:bg-[#2C3A41]/50 backdrop-blur-sm rounded-2xl text-left border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                    <FileIcon className="h-8 w-8 text-[#9DB0A2] flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="font-semibold truncate">{file.name}</p>
                        <p className="text-sm text-current/60">{formatBytes(file.size)}</p>
                    </div>
                </div>
                <button onClick={onCancel} aria-label="Remove file" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <TrashIcon className="h-5 w-5 text-current/60" />
                </button>
            </div>
            
            <div className="mt-6">
                <label className="font-semibold block mb-2">Action</label>
                <div className="flex gap-2 rounded-lg bg-black/5 dark:bg-white/5 p-1">
                    {isCompressible && (
                        <button onClick={() => setMode('compress')} className={`flex-1 p-2 rounded-md text-sm font-medium transition-colors ${mode === 'compress' ? 'bg-[#F9F7F3] dark:bg-[#2C3A41] shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>Compress</button>
                    )}
                    <button onClick={() => setMode('inflate')} className={`flex-1 p-2 rounded-md text-sm font-medium transition-colors ${mode === 'inflate' ? 'bg-[#F9F7F3] dark:bg-[#2C3A41] shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>Inflate</button>
                </div>
            </div>
            
            <div className="mt-6">
                <label htmlFor="target-size" className="font-semibold block mb-2">Target Size</label>
                <div className="flex items-center gap-4">
                    <input 
                        id="target-size" 
                        type="range" 
                        min={sliderMin}
                        max={sliderMax}
                        value={targetSizeKb}
                        onChange={(e) => setTargetSizeKb(Number(e.target.value))}
                        className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer dark:bg-white/10" 
                    />
                    <div className="w-32 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                aria-label="Target size in kilobytes"
                                value={kbInput}
                                onChange={handleKbInputChange}
                                onBlur={handleKbInputBlur}
                                onFocus={e => e.target.select()}
                                className="w-full bg-black/5 dark:bg-white/5 rounded-md font-mono text-sm py-2 pr-9 pl-2 text-center focus:outline-none focus:ring-2 focus:ring-[#9DB0A2] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-current/60 select-none pointer-events-none">KB</span>
                        </div>
                        <p className="text-xs text-current/50 mt-1 text-center font-mono">
                            ({(targetSizeKb / 1024).toFixed(2)} MB)
                        </p>
                    </div>
                </div>
                <p className="text-xs text-current/50 mt-2 text-center">
                  {mode === 'compress' 
                    ? `Compresses image to approximately this size.` 
                    : `Pads file to exactly this size.`}
                </p>
            </div>

            <button onClick={handleProcess} className="w-full mt-8 bg-[#3A3A3A] text-[#F9F7F3] dark:bg-[#F9F7F3] dark:text-[#3A3A3A] font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9DB0A2] dark:focus:ring-offset-[#2C3A41]">
                Process File
            </button>
        </div>
    );
};

const SuccessStep: React.FC<{ outputFile: OutputFile; onReset: () => void; }> = ({ outputFile, onReset }) => {
    const downloadUrl = URL.createObjectURL(outputFile.blob);
    const sizeReduction = outputFile.originalSize - outputFile.blob.size;
    
    useEffect(() => {
        return () => URL.revokeObjectURL(downloadUrl);
    }, [downloadUrl]);

    return (
        <div className="w-full text-center p-8 bg-[#F9F7F3]/80 dark:bg-[#2C3A41]/50 backdrop-blur-sm rounded-2xl border border-black/5 dark:border-white/5">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold">Success!</h3>
            <p className="text-current/60 mt-1">Your file is ready to download.</p>
            
            <div className="text-left bg-black/5 dark:bg-white/5 p-4 rounded-lg my-6 space-y-2 text-sm">
                <div className="flex justify-between"><span className="font-medium text-current/80">Original Size:</span> <span>{formatBytes(outputFile.originalSize)}</span></div>
                <div className="flex justify-between"><span className="font-medium text-current/80">New Size:</span> <span>{formatBytes(outputFile.blob.size)}</span></div>
                {sizeReduction > 0 && (
                     <div className="flex justify-between text-green-600 dark:text-green-400"><span className="font-medium">Reduction:</span> <span>{formatBytesSimple(sizeReduction)} ({Math.round(sizeReduction * 100 / outputFile.originalSize)}%)</span></div>
                )}
                 {sizeReduction < 0 && (
                     <div className="flex justify-between text-blue-600 dark:text-blue-400"><span className="font-medium">Increase:</span> <span>{formatBytesSimple(Math.abs(sizeReduction))}</span></div>
                )}
            </div>

            <a href={downloadUrl} download={outputFile.name} className="w-full flex items-center justify-center gap-2 bg-[#3A3A3A] text-[#F9F7F3] dark:bg-[#F9F7F3] dark:text-[#3A3A3A] font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9DB0A2] dark:focus:ring-offset-[#2C3A41]">
                <DownloadIcon className="h-5 w-5" />
                Download File
            </a>
            <button onClick={onReset} className="w-full mt-3 text-sm text-current/70 hover:text-[#9DB0A2] transition-colors font-medium">
                Process Another File
            </button>
        </div>
    );
};

const ErrorStep: React.FC<{ message: string; onReset: () => void }> = ({ message, onReset }) => (
    <div className="w-full text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl">
        <AlertTriangleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">An Error Occurred</h3>
        <p className="text-red-600 dark:text-red-300 mt-1">{message}</p>
        <button onClick={onReset} className="mt-6 bg-red-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors">
            Try Again
        </button>
    </div>
);

const FaqItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-black/10 dark:border-white/10">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left py-4">
                <span className="font-semibold">{question}</span>
                <ChevronDownIcon className={`h-5 w-5 text-current/50 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="pb-4 text-current/70">{children}</div>
            </div>
        </div>
    );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
            aria-modal="true" 
            role="dialog"
        >
            <div 
                className="bg-[#F9F7F3] dark:bg-[#2C3A41] rounded-2xl shadow-xl max-w-2xl w-full m-4 flex flex-col max-h-[80vh]" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-black/10 dark:border-white/10">
                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" aria-label="Close modal">
                        <XIcon className="h-5 w-5 text-current/70" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 text-current/80">
                    {children}
                </div>
            </div>
        </div>
    );
};


// --- CORE APP COMPONENT ---
const App: React.FC = () => {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [outputFile, setOutputFile] = useState<OutputFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalType | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = modal || isMenuOpen ? 'hidden' : 'auto';
    }, [modal, isMenuOpen]);

    const resetState = useCallback(() => {
        setStep('upload');
        setFile(null);
        setOutputFile(null);
        setError(null);
    }, []);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setError(`File is too large. Maximum size is ${formatBytesSimple(MAX_FILE_SIZE_BYTES)}.`);
            setStep('error');
            return;
        }
        setFile(selectedFile);
        setStep('configure');
    }, []);
    
    const handleProcess = useCallback(async (mode: Mode, options: any) => {
        if (!file) return;
        setStep('processing');
        try {
            let resultBlob: Blob;
            let outputFileName = file.name;
            const { targetSize } = options;

            if (mode === 'compress') {
                const imageBitmap = await createImageBitmap(file);
                const canvas = document.createElement('canvas');
                canvas.width = imageBitmap.width;
                canvas.height = imageBitmap.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');
                ctx.drawImage(imageBitmap, 0, 0);

                const getBlob = (quality: number): Promise<Blob> => {
                    return new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality);
                    });
                };

                let low = 0;
                let high = 1;
                let bestBlob: Blob | null = null;
                for (let i = 0; i < 10; i++) { // Binary search for quality
                    const mid = (low + high) / 2;
                    const currentBlob = await getBlob(mid);
                    if (currentBlob.size > targetSize) {
                        high = mid;
                    } else {
                        bestBlob = currentBlob;
                        low = mid;
                    }
                }
                
                if (!bestBlob) { 
                    bestBlob = await getBlob(0.01);
                }

                resultBlob = bestBlob;
                const nameParts = file.name.split('.').slice(0, -1);
                outputFileName = `${nameParts.join('.')}-compressed.jpg`;
            } else { // inflate
                const padding = new Uint8Array(Math.max(0, targetSize - file.size));
                resultBlob = new Blob([file, padding], { type: file.type });
            }
            setOutputFile({ blob: resultBlob, name: outputFileName, originalSize: file.size });
            setStep('success');
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred during processing.');
            setStep('error');
        }
    }, [file]);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const href = e.currentTarget.getAttribute('href');
        if (!href) return;

        const targetElement = document.querySelector(href);
        if (targetElement) {
            // The header has a class of 'h-16', which is 4rem or 64px.
            const headerOffset = 64; 
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;
      
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };
    
    const handleMobileLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        handleNavClick(e);
        setIsMenuOpen(false);
    };

    const renderStep = () => {
        switch (step) {
            case 'upload': return <UploadStep onFileSelect={handleFileSelect} />;
            case 'configure': return file && <ConfigureStep file={file} onProcess={handleProcess} onCancel={resetState} />;
            case 'processing': return <div className="flex flex-col items-center justify-center p-8"><Spinner className="h-12 w-12 text-[#9DB0A2]" /><p className="mt-4 text-current/70">Processing your file...</p></div>;
            case 'success': return outputFile && <SuccessStep outputFile={outputFile} onReset={resetState} />;
            case 'error': return error && <ErrorStep message={error} onReset={resetState} />;
            default: return null;
        }
    };

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'FAQ', href: '#faq' },
    ];
    
    const featureItems = [
        { icon: ShieldCheckIcon, title: "Privacy First", description: "Your files are never uploaded to a server. All processing happens directly in your browser, ensuring your data remains private and secure." },
        { icon: ScissorsIcon, title: "Artisanal Precision", description: "Whether you need to shrink large images or inflate a file to meet a minimum size requirement, this tool has you covered with exact precision." },
        { icon: ZapIcon, title: "Blazing Fast", description: "Leveraging your device's processing power means no waiting for uploads or downloads from a server. Get your resized files almost instantly." }
    ];

    const faqItems = [
        { q: "Are my files secure?", a: "Absolutely. This tool operates 100% on your local machine. Your files never leave your computer, making it as secure as working on your own desktop." },
        { q: "What is file inflation?", a: "File inflation is the process of adding extra, empty data to a file to increase its size to a specific target. This is useful for meeting minimum file size requirements for online submissions without altering the original content." },
        { q: "What happens to image quality when compressing?", a: "Compressing a JPEG image is 'lossy,' which means some visual data is discarded to reduce file size. Our tool intelligently finds the highest possible quality to match your target size, but some degradation is unavoidable. The goal is to make it as unnoticeable as possible." },
        { q: "Is this service truly free?", a: "Yes, this tool is completely free to use. Since all processing is done in your browser, we don't have expensive server costs, allowing us to offer this service at no charge." }
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 bg-[#F9F7F3]/80 dark:bg-[#2C3A41]/80 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                    <a href="#" className="flex items-center gap-2.5">
                        <ScissorsIcon className="h-6 w-6 text-current" />
                        <span className="text-xl font-bold text-current" style={{ fontFamily: "'Playfair Display', serif" }}>Digitailor</span>
                    </a>
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map(link => <a key={link.name} href={link.href} onClick={handleNavClick} className="text-sm font-medium text-current/80 hover:text-current transition-colors">{link.name}</a>)}
                    </div>
                     <button onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="p-2 rounded-full text-current/70 hover:bg-black/5 dark:hover:bg-white/10 transition-colors md:hidden">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                </nav>
            </header>
            
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-[#F9F7F3] dark:bg-[#2C3A41] shadow-xl transition-transform transform translate-x-0">
                        <div className="p-4 flex items-center justify-between border-b border-black/10 dark:border-white/10">
                             <a href="#" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2.5">
                                <ScissorsIcon className="h-6 w-6 text-current" />
                                <span className="text-xl font-bold text-current" style={{ fontFamily: "'Playfair Display', serif" }}>Digitailor</span>
                            </a>
                            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="p-2 -mr-2 rounded-full text-current/70 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="p-4">
                            <ul className="space-y-2">
                                {navLinks.map(link => (
                                    <li key={link.name}>
                                        <a href={link.href} onClick={handleMobileLinkClick} className="block w-full text-left p-2 rounded-md font-medium text-current/80 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">{link.name}</a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>
            )}
            
            <main className="flex-grow">
                <section id="hero" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center relative overflow-hidden">
                    <HeroDecorations />
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#3A3A3A] dark:text-[#F9F7F3]" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Crafted to Perfection
                    </h1>
                    <p className="mt-4 text-2xl sm:text-3xl text-[#9DB0A2] font-bold">
                        Your Files, Precisely Tailored.
                    </p>
                    <p className="mt-8 max-w-xl mx-auto text-md text-[#3A3A3A]/70 dark:text-[#F9F7F3]/70">
                        Set the precise final size for any file or find the smallest guaranteed fit for your images. All adjustments are made with artisanal precision—all securely in your browser.
                    </p>
                     <p className="mt-4 text-sm text-[#3A3A3A]/50 dark:text-[#F9F7F3]/50 italic">*No server uploads. Your files never leave the device.</p>
                    <div className="mt-10 max-w-lg mx-auto">
                        {renderStep()}
                    </div>
                     <p className="text-xs text-center mt-4 text-[#3A3A3A]/50 dark:text-[#F9F7F3]/50">Max file size: {formatBytesSimple(MAX_FILE_SIZE_BYTES)}</p>
                </section>

                <section id="features" className="py-16 sm:py-24 bg-black/5 dark:bg-white/5 scroll-mt-16">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                             <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Why Choose Digitailor?</h2>
                             <p className="mt-4 max-w-2xl mx-auto text-lg text-current/70">Everything you need for clean, safe, and precise file size manipulation.</p>
                        </div>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                            {featureItems.map(item => (
                                <div key={item.title} className="flex flex-col items-center">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#9DB0A2]/30 text-[#3A3A3A] dark:text-[#F9F7F3]">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                                    <p className="mt-2 text-base text-current/70">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                 <section id="how-it-works" className="py-16 sm:py-24 scroll-mt-16">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Simple Steps to Tailor Your File</h2>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-current/70">Get your file ready in under a minute.</p>
                        </div>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                           <div className="absolute top-1/2 -mt-px w-full h-px bg-transparent hidden md:block" aria-hidden="true">
                                <svg className="w-full h-px" preserveAspectRatio="none" viewBox="0 0 100 1" >
                                    <path d="M0,0.5 H100" stroke="var(--line-color, #9DB0A2)" strokeWidth="2" strokeDasharray="6, 6" />
                                </svg>
                            </div>
                            <style>{`:root { --line-color: #9DB0A2; } .dark { --line-color: #5d6c61; }`}</style>
                            <div className="text-center p-6 bg-[#F9F7F3] dark:bg-[#2C3A41] rounded-xl border border-black/5 dark:border-white/5 relative">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#9DB0A2] text-white flex items-center justify-center font-bold">1</div>
                                <h3 className="font-semibold mt-4">Upload Your File</h3>
                                <p className="mt-2 text-sm text-current/70">Drag and drop or select a file from your device. It's loaded into the browser, not a server.</p>
                            </div>
                             <div className="text-center p-6 bg-[#F9F7F3] dark:bg-[#2C3A41] rounded-xl border border-black/5 dark:border-white/5 relative">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#9DB0A2] text-white flex items-center justify-center font-bold">2</div>
                                <h3 className="font-semibold mt-4">Configure Settings</h3>
                                <p className="mt-2 text-sm text-current/70">Choose to compress your image or inflate your file, then adjust the target size.</p>
                            </div>
                             <div className="text-center p-6 bg-[#F9F7F3] dark:bg-[#2C3A41] rounded-xl border border-black/5 dark:border-white/5 relative">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#9DB0A2] text-white flex items-center justify-center font-bold">3</div>
                                <h3 className="font-semibold mt-4">Download Instantly</h3>
                                <p className="mt-2 text-sm text-current/70">Process the file and download the result immediately. No waiting, no queues.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-16 sm:py-24 bg-black/5 dark:bg-white/5 scroll-mt-16">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Frequently Asked Questions</h2>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-current/70">Have questions? We've got answers.</p>
                        </div>
                        <div className="mt-12 max-w-3xl mx-auto">
                            {faqItems.map(item => <FaqItem key={item.q} question={item.q}>{item.a}</FaqItem>)}
                        </div>
                    </div>
                </section>
            </main>
            
            <footer className="bg-[#2C3A41] dark:bg-[#1C262B] text-[#F9F7F3]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                         <a href="#" className="flex items-center gap-2.5">
                            <ScissorsIcon className="h-6 w-6 text-current" />
                            <span className="text-xl font-bold text-current" style={{ fontFamily: "'Playfair Display', serif" }}>Digitailor</span>
                        </a>
                        <p className="text-sm text-current/60">&copy; {new Date().getFullYear()} Digitailor. All rights reserved.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setModal('terms')} className="text-sm text-current/60 hover:text-current transition-colors">Terms of Service</button>
                            <button onClick={() => setModal('privacy')} className="text-sm text-current/60 hover:text-current transition-colors">Privacy Policy</button>
                            <button onClick={() => setModal('contact')} className="text-sm text-current/60 hover:text-current transition-colors">Contact Us</button>
                            <button onClick={() => setModal('donate')} className="text-sm text-current/60 hover:text-current transition-colors">Donate</button>
                        </div>
                    </div>
                </div>
            </footer>
            
            <Modal isOpen={modal === 'terms'} onClose={() => setModal(null)} title="Terms of Service">
                <p>Welcome to Digitailor. By using our service, you agree to these terms. This service is provided "as is" for personal, non-commercial use. You agree not to use the service for any illegal activities.</p>
                <p><strong>Service Description:</strong> Digitailor is a client-side file processing tool. All file manipulation occurs directly within your web browser. Your files are never sent to, or stored on, our servers. This ensures your data remains private.</p>
                <p><strong>Disclaimer:</strong> While we strive for accuracy, we do not guarantee that the file processing will be error-free or that the output will always meet your specific requirements. We are not liable for any data loss or damage that may result from using this tool.</p>
            </Modal>

            <Modal isOpen={modal === 'privacy'} onClose={() => setModal(null)} title="Privacy Policy">
                <p className="font-semibold text-lg">Your privacy is our core feature.</p>
                <p>Digitailor is designed from the ground up to be completely private. We believe you shouldn't have to trade your data for a simple utility.</p>
                <p><strong>Data Collection:</strong> We collect absolutely no personal data. None. Your files, your usage patterns, your IP address—none of it is ever sent to us or any third party.</p>
                <p><strong>How It Works:</strong> All the magic happens on your computer. When you select a file, it's processed by code running in your browser (JavaScript). It is never uploaded to a server. When you download the result, you're simply saving the modified file from your browser's memory back to your computer.</p>
                <p><strong>Cookies:</strong> We use a single item in your browser's `localStorage` to remember your theme preference (light or dark mode). This is not a tracking cookie and stores no personal information.</p>
            </Modal>
            
            <Modal isOpen={modal === 'contact'} onClose={() => setModal(null)} title="Contact Us">
                <p>Have a question, feedback, or a suggestion? We'd love to hear from you.</p>
                <p>You can reach out to us via email:</p>
                <a href="mailto:contact@digitailor.com" className="font-semibold text-[#9DB0A2] hover:underline">contact@digitailor.com</a>
                <p>We'll do our best to respond as soon as possible.</p>
            </Modal>

             <Modal isOpen={modal === 'donate'} onClose={() => setModal(null)} title="Support Digitailor">
                <p>Digitailor is a free tool, offered without ads or trackers, because we believe in providing simple, private utilities for everyone.</p>
                <p>If you find this service helpful, please consider making a small donation. Your support helps us cover our costs and dedicate time to developing new features and improvements.</p>
                <div className="mt-6 text-center">
                    <a 
                        href="https://www.paypal.com/donate/?hosted_button_id=A23W9KUZ36AV6" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block bg-[#3A3A3A] text-[#F9F7F3] dark:bg-[#F9F7F3] dark:text-[#3A3A3A] font-semibold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9DB0A2] dark:focus:ring-offset-[#2C3A41]"
                    >
                        Donate via PayPal
                    </a>
                </div>
            </Modal>
        </div>
    );
};

export default App;
