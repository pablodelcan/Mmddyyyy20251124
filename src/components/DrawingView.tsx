import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Trash2, Download } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Media } from '@capacitor-community/media';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'sonner';

interface DrawingViewProps {
    onClose: () => void;
    timeOfDay?: 'day' | 'night';
}

export function DrawingView({ onClose, timeOfDay = 'day' }: DrawingViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

    // Drawing parameters
    const [contrast, setContrast] = useState(80);
    const [density, setDensity] = useState(1.0);
    const [pixelation, setPixelation] = useState(0);
    const [thickness, setThickness] = useState(0.5);
    const [randomness, setRandomness] = useState(0);

    // Preview canvas
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Force Dark Mode for this view
    const isDark = true;
    const displayTimeOfDay = 'night'; // Force night mode for UI components if needed

    const backgroundColor = '#000000'; // Updated to pure black
    const textColor = 'rgba(255, 255, 255, 0.9)'; // White 90% opacity
    const canvasBackground = '#FDF5ED'; // Updated canvas color
    const controlPanelBg = '#000000';
    const controlTextColor = 'rgba(255, 255, 255, 0.9)';

    // Initialize and Resize Canvas Dynamically
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;

        const handleResize = () => {
            if (!canvas || !container) return;

            // Get the visual size of the canvas element (constrained by CSS)
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // Set internal resolution to match visual size * DPR
            // Only update if dimensions changed to avoid flickers/clearing
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;

                // Re-fill background
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(dpr, dpr);
                    ctx.fillStyle = canvasBackground;
                    ctx.fillRect(0, 0, rect.width, rect.height);
                }
            }
            updatePreview();
        };

        // Initial setup
        handleResize();

        // Listen for window resize to adjust
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [canvasBackground]);

    // Imperative Event Listeners for robust Touch handling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getPoint = (e: TouchEvent | MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            let clientX: number, clientY: number;

            if ('touches' in e) {
                if (e.touches.length === 0) return null;
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = (e as MouseEvent).clientX;
                clientY = (e as MouseEvent).clientY;
            }

            return {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        };

        const handleStart = (e: TouchEvent | MouseEvent) => {
            if (e.cancelable) e.preventDefault();
            const point = getPoint(e);
            if (point) {
                setIsDrawing(true);
                setLastPoint(point);

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const width = thicknessRef.current * 10;
                    const pixelation = pixelationRef.current; // 0 (round) to 100 (square)
                    const contrastVal = contrastRef.current;
                    const r = randomnessRef.current;

                    // Calculate color
                    const gray = Math.floor(255 * (1 - contrastVal / 100));
                    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                    ctx.globalAlpha = 1.0; // Reset opacity

                    // Random offset for start point
                    const rx = r > 0 ? (Math.random() - 0.5) * r * 5 : 0;
                    const ry = r > 0 ? (Math.random() - 0.5) * r * 5 : 0;
                    const finalX = point.x + rx;
                    const finalY = point.y + ry;

                    // Draw single dot
                    ctx.beginPath();
                    if (pixelation < 5) {
                        ctx.arc(finalX, finalY, width / 2, 0, Math.PI * 2);
                    } else if (pixelation > 90) {
                        ctx.rect(finalX - width / 2, finalY - width / 2, width, width);
                    } else {
                        // Rounded Rect simulation
                        const radius = (width / 2) * (1 - pixelation / 100);
                        if (typeof ctx.roundRect === 'function') {
                            ctx.roundRect(finalX - width / 2, finalY - width / 2, width, width, radius);
                        } else {
                            // Fallback for older environments: just rect or arc based on threshold
                            pixelation > 50
                                ? ctx.rect(finalX - width / 2, finalY - width / 2, width, width)
                                : ctx.arc(finalX, finalY, width / 2, 0, Math.PI * 2);
                        }
                    }
                    ctx.fill();
                }
            }
        };

        const handleMove = (e: TouchEvent | MouseEvent) => {
            if (e.cancelable) e.preventDefault();
            if (!isDrawingRef.current || !lastPointRef.current) return;

            const point = getPoint(e);
            if (!point) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const width = thicknessRef.current * 10;
            const pixelation = pixelationRef.current;
            const density = Math.max(0.1, densityRef.current); // Avoid 0
            const contrastVal = contrastRef.current;
            const r = randomnessRef.current;

            // Density controls SPACING
            // High Density (2.0) = Low Spacing (0.5px or minimal)
            // Low Density (0.1) = High Spacing
            // Base spacing for "continuous" feel is typically 1px or width/10.
            // Let's say Density 1.0 = Spacing of 1px (or smooth).
            // Density 0.1 = Spacing of width * 2 (gaps).

            // Formula: stepSize = max(1, width * (1.5 - density)) ?? 
            // If density 2.0 -> 1.5 - 2 = -0.5 -> max 1.
            // If density 1.0 -> 1.5 - 1 = 0.5 * width.
            // If density 0.1 -> 1.5 - 0.1 = 1.4 * width.

            // Actually, usually Density maps: 1.0 -> 0 gaps.
            // Let's try: step = max(1, (2.1 - density) * (width / 5)) 
            // If Density=2 -> 0.1 * width/5 ~ 0.
            // If Density=0.1 -> 2.0 * width/5.

            // Simpler: step = max(1, 10 / density). If density is 0.1, step is 100. If 2.0, step is 5.
            // But it should relate to brush width.
            const stepSize = Math.max(1, (width * 0.5) / density);

            const dx = point.x - lastPointRef.current.x;
            const dy = point.y - lastPointRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const steps = Math.ceil(distance / stepSize);

            const gray = Math.floor(255 * (1 - contrastVal / 100));
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            ctx.globalAlpha = 1.0;

            for (let i = 0; i < steps; i++) {
                const t = (i + 1) / steps; // i+1 to reach current point, handleStart handled the previous point
                const x = lastPointRef.current.x + dx * t;
                const y = lastPointRef.current.y + dy * t;

                // Randomness / Jitter
                const rx = r > 0 ? (Math.random() - 0.5) * r * 5 : 0;
                const ry = r > 0 ? (Math.random() - 0.5) * r * 5 : 0;
                const finalX = x + rx;
                const finalY = y + ry;

                ctx.beginPath();

                // Shape Logic
                if (pixelation < 5) {
                    ctx.arc(finalX, finalY, width / 2, 0, Math.PI * 2);
                } else if (pixelation > 90) {
                    ctx.rect(finalX - width / 2, finalY - width / 2, width, width);
                } else {
                    const radius = (width / 2) * (1 - pixelation / 100);
                    if (typeof ctx.roundRect === 'function') {
                        ctx.roundRect(finalX - width / 2, finalY - width / 2, width, width, radius);
                    } else {
                        // Manual polyfill for simple shapes if needed later, or fallback
                        // Fallback logic
                        pixelation > 50
                            ? ctx.rect(finalX - width / 2, finalY - width / 2, width, width)
                            : ctx.arc(finalX, finalY, width / 2, 0, Math.PI * 2);
                    }
                }
                ctx.fill();
            }

            setLastPoint(point);
        };

        const handleEnd = (e: TouchEvent | MouseEvent) => {
            if (e.cancelable) e.preventDefault();
            setIsDrawing(false);
            setLastPoint(null);
            updatePreview();
        };

        canvas.addEventListener('touchstart', handleStart, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        canvas.addEventListener('touchend', handleEnd, { passive: false });
        canvas.addEventListener('mousedown', handleStart);
        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('mouseup', handleEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleStart);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchend', handleEnd);
            canvas.removeEventListener('mousedown', handleStart);
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('mouseup', handleEnd);
        };
    }, []); // Bind once, use refs for mutable state

    // Refs for current state values inside generic listener
    const isDrawingRef = useRef(isDrawing);
    const lastPointRef = useRef(lastPoint);
    const contrastRef = useRef(contrast);
    const thicknessRef = useRef(thickness);
    const randomnessRef = useRef(randomness);
    const densityRef = useRef(density);
    const pixelationRef = useRef(pixelation);

    useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
    useEffect(() => { lastPointRef.current = lastPoint; }, [lastPoint]);
    useEffect(() => { contrastRef.current = contrast; }, [contrast]);
    useEffect(() => { thicknessRef.current = thickness; }, [thickness]);
    useEffect(() => { randomnessRef.current = randomness; }, [randomness]);
    useEffect(() => { densityRef.current = density; }, [density]);
    useEffect(() => { pixelationRef.current = pixelation; }, [pixelation]);

    const stopDrawing = () => {
        setIsDrawing(false);
        setLastPoint(null);
        updatePreview();
    };

    const updatePreview = () => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        if (!canvas || !previewCanvas) return;

        const ctx = previewCanvas.getContext('2d');
        if (!ctx) return;

        // Draw scaled down version
        ctx.fillStyle = canvasBackground;
        ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.globalAlpha = 1.0; // Reset opacity before clearing!
                ctx.fillStyle = canvasBackground;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
        updatePreview();
    };



    const saveToGallery = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.split(',')[1];
                const fileName = `drawing-${Date.now()}.png`;

                // Write to Cache directory first
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });

                // Save to Gallery
                await Media.savePhoto({
                    path: savedFile.uri,
                });

                toast.success('Drawing saved in gallery', {
                    style: {
                        background: '#1a1a1a',
                        color: '#ffffff',
                        border: '1px solid #333333',
                    },
                    duration: 2000,
                });
            } catch (error) {
                console.error('Save failed:', error);
                // Fallback for web or error
                const link = document.createElement('a');
                link.download = `drawing-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }
    };

    const styles = {
        label: {
            display: 'block',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontStyle: 'normal',
            fontSize: '12px',
            lineHeight: '16px',
            letterSpacing: '0px',
            color: controlTextColor,
            marginBottom: '12px',
        } as React.CSSProperties,
        value: {
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontStyle: 'normal',
            fontSize: '12px',
            color: controlTextColor,
            opacity: 0.6,
            textAlign: 'center' as const,
        } as React.CSSProperties,
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100dvh',
                backgroundColor: controlPanelBg,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                touchAction: 'none', // Critical: prevent scrolling on the whole view
            }}
        >
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500&display=swap');
        `}
            </style>

            {/* Top Bar - Fixed Height */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 22px',
                    paddingTop: 'max(env(safe-area-inset-top), 20px)',
                    backgroundColor: '#000000', // Ensure top bar matches
                    flexShrink: 0, // Prevent shrinking
                }}
            >
                {/* Close/Theme Button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    {/* Rectangle icon scaled to match proportions (approx 1.3x of 16x21) */}
                    <div
                        style={{
                            width: '22px',
                            height: '29px',
                            backgroundColor: '#000000',
                            borderRadius: '1px',
                        }}
                    />
                </button>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={clearCanvas}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#364153', // Updated background
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Trash2 style={{ width: '18px', height: '18px', color: '#D1D5DC' }} />
                    </button>
                    <button
                        onClick={saveToGallery}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#364153', // Updated background
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Download style={{ width: '18px', height: '18px', color: '#D1D5DC' }} />
                    </button>
                </div>
            </div>

            {/* Canvas Area - Flexible, Shrinkable */}
            <div
                style={{
                    flex: 1, // Take available space
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center', // Center vertically
                    padding: '10px 0',
                    backgroundColor: '#000000',
                    minHeight: 0, // Allow shrinking
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 16px', // Standard horizontal padding allowed
                    maxWidth: '100%', // REMOVED CONSTRAINT
                }}>
                    <canvas
                        ref={canvasRef}
                        // Removed hardcoded width/height - handled by ref logic
                        style={{
                            width: '100%',
                            maxWidth: '361.45px', // Still limit visual width loosely to avoid giant ipad scaling but let logic handle it? No, keeping it as requested.
                            height: 'auto',
                            aspectRatio: '346.74/448.72',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            backgroundColor: canvasBackground,
                            borderRadius: '8px',
                            touchAction: 'none',
                        }}
                    />
                </div>
            </div>

            {/* Controls Container - Fixed Bottom content, but responsive */}
            <div
                style={{
                    width: 'calc(100% - 32px)',
                    maxWidth: '361.45px',
                    margin: '0 auto',
                    marginBottom: 'max(env(safe-area-inset-bottom), 20px)',
                    paddingTop: '16.6px',
                    paddingRight: '16.6px',
                    paddingBottom: '16px',
                    paddingLeft: '16.6px',
                    borderRadius: '14px',
                    borderWidth: '0.61px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: '#000000',
                    flexShrink: 0, // Don't let controls shrink
                }}
            >
                {/* Inner Layout Container */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    {/* Top Row: Contrast & Density */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: 'auto' }}>
                        {/* Contrast */}
                        <div>
                            <label style={styles.label}>
                                Contrast
                            </label>
                            <div style={styles.value}>
                                {contrast}%
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={contrast}
                                onChange={(e) => setContrast(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    accentColor: controlTextColor,
                                }}
                            />
                        </div>

                        {/* Density */}
                        <div>
                            <label style={styles.label}>
                                Density
                            </label>
                            <div style={styles.value}>
                                {density.toFixed(1)}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={density}
                                onChange={(e) => setDensity(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    accentColor: controlTextColor,
                                }}
                            />
                        </div>
                    </div>

                    {/* Middle Row: Pixelation & Thickness */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: 'auto' }}>
                        {/* Pixelation */}
                        <div>
                            <label style={styles.label}>
                                Pixelation
                            </label>
                            <div style={styles.value}>
                                {pixelation}%
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={pixelation}
                                onChange={(e) => setPixelation(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    accentColor: controlTextColor,
                                }}
                            />
                        </div>

                        {/* Thickness */}
                        <div>
                            <label style={styles.label}>
                                Thickness
                            </label>
                            <div style={styles.value}>
                                {thickness.toFixed(1)}
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.1"
                                value={thickness}
                                onChange={(e) => setThickness(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    accentColor: controlTextColor,
                                }}
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Randomness & Preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: 'auto' }}>
                        {/* Randomness */}
                        <div>
                            <label style={styles.label}>
                                Randomness
                            </label>
                            <div style={styles.value}>
                                {randomness}%
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={randomness}
                                onChange={(e) => setRandomness(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginTop: '8px',
                                    accentColor: controlTextColor,
                                }}
                            />
                        </div>

                        {/* Preview */}
                        <div>
                            <label style={styles.label}>
                                Preview
                            </label>
                            <canvas
                                ref={previewCanvasRef}
                                width={100}
                                height={100}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    backgroundColor: canvasBackground,
                                    borderRadius: '8px',
                                    margin: '0 auto',
                                    display: 'block',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
