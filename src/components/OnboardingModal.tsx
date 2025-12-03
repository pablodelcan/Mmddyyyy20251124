import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { ArrowRight, GripVertical, Clock, ArrowUp, Grid3X3 } from 'lucide-react';

interface OnboardingModalProps {
    onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const totalSteps = 6;

    const handleNext = () => {
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    // Screen 1: Introduction
    const renderScreen1 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                mmddyyyy onboarding
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                }}
            >
                <p style={{ margin: 0 }}>
                    mmddyyyy is a task application designed to keep you focused on what matters today while maintaining awareness of the bigger picture. Unfinished tasks automatically roll into the next day, supporting a steady, realistic pace of progress. The app is built on a simple idea: your time is finite. By showing this clearly, mmddyyyy helps you prioritize the tasks and goals that deserve your attention.
                </p>
            </div>
        </>
    );

    // Screen 2: Drag & Drop
    const renderScreen2 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                Drag & Drop
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <p style={{ margin: 0, marginBottom: '30px' }}>
                    Long-press a task to drag it up or down and reorder your day.
                </p>

                {/* Sample Task */}
                <div
                    style={{
                        width: '139.51px',
                        height: '35.73px',
                        padding: '0',
                        paddingLeft: '14.99px',
                        backgroundColor: 'rgba(2, 2, 1, 0.1)',
                        border: '0.61px solid rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7.5px',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: '#000000',
                        margin: '0 auto',
                        marginTop: '30px',
                    }}
                >
                    <GripVertical style={{ width: '15px', height: '15px', color: '#666' }} />
                    Sample task
                </div>
            </div>
        </>
    );


    // Screen 3: Timer
    const renderScreen3 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                Timer
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <p style={{ margin: 0, marginBottom: '50px', textAlign: 'left', width: '100%' }}>
                    The timer starts a focused session. When the session finishes, the task is marked complete.
                </p>

                {/* Timer Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: '#000000',
                    }}
                >
                    <Clock style={{ width: '24px', height: '24px', color: '#000' }} />
                    <span>10:00</span>
                </div>
            </div>
        </>
    );

    // Screen 4: Highlighting
    const renderScreen4 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                Highlighting
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <p style={{ margin: 0, marginBottom: '50px' }}>
                    Tap the arrow icon on any task to highlight it. Highlighted tasks stand out with a yellow background to mark priority items.
                </p>

                {/* Priority Task Button */}
                <div
                    style={{
                        padding: '10px 15px',
                        backgroundColor: 'rgba(2, 2, 1, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7.5px',
                        fontFamily: 'Courier New',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: '#000000',
                        margin: '0 auto',
                    }}
                >
                    <ArrowUp style={{ width: '15px', height: '15px', color: '#000' }} />
                    Priority task
                </div>
            </div>
        </>
    );

    // Screen 5: Meditation
    const renderScreen5 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                Meditation
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <p style={{ margin: 0, marginBottom: '50px', textAlign: 'left', width: '100%' }}>
                    Take a mindful break with the meditation timer. Track your sessions and build a consistent practice.
                </p>

                {/* Meditation Button */}
                <div
                    style={{
                        width: '29.99px',
                        height: '29.99px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '17981000px',
                        padding: 0,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                />
            </div>
        </>
    );

    // Screen 6: Life in Weeks
    const renderScreen6 = () => (
        <>
            <h1
                style={{
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    letterSpacing: '0px',
                    color: '#000000',
                    margin: 0,
                    marginBottom: '30px',
                }}
            >
                Life in Weeks
            </h1>
            <div
                style={{
                    flex: 1,
                    fontFamily: 'Courier New',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '22.5px',
                    color: '#000000',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <p style={{ margin: 0, marginBottom: '60px' }}>
                    The grid icon shows your life visualized in weeks. Each square is one week—a reminder to make every week count.
                </p>


                {/* Grid Icon */}
                <div
                    style={{
                        width: '103.87px',
                        height: '37.71px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                    }}
                >
                    <img
                        src="/onboard.png"
                        alt="Life in weeks grid"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            </div>
        </>
    );
    const renderContent = () => {
        switch (step) {
            case 0:
                return renderScreen1();
            case 1:
                return renderScreen2();
            case 2:
                return renderScreen3();
            case 3:
                return renderScreen4();
            case 4:
                return renderScreen5();
            case 5:
                return renderScreen6();
            default:
                return renderScreen1();
        }
    };

    const modalContent = (
        <div
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100dvh',
                margin: 0,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: '363.44px',
                    height: step === 1 ? '376.20px' : step === 2 ? '424.95px' : step === 3 ? '449.33px' : step === 4 ? '424.95px' : step === 5 ? '424.95px' : '644.36px',
                    backgroundColor: '#FDF5ED',
                    border: '0.61px solid rgba(0, 0, 0, 0.1)',
                    paddingTop: '30.61px',
                    paddingRight: '30.61px',
                    paddingBottom: '0.61px',
                    paddingLeft: '30.61px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    fontFamily: 'Courier New, Courier, monospace',
                }}
            >
                {/* Content Box */}
                <div
                    style={{
                        width: '302.22px',
                        height: step === 1 ? '314.97px' : step === 2 ? '363.73px' : step === 3 ? '388.11px' : step === 4 ? '363.73px' : step === 5 ? '363.73px' : '583.14px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Dynamic Content */}
                    {renderContent()}

                    {/* Footer Controls */}
                    <div
                        style={{
                            marginTop: 'auto',
                            paddingBottom: '30px',
                        }}
                    >
                        {/* Pagination Dots */}
                        <div
                            style={{
                                display: 'flex',
                                gap: '8px',
                                marginBottom: '20px',
                            }}
                        >
                            {[...Array(totalSteps)].map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: index === step ? '#000000' : 'rgba(0, 0, 0, 0.2)',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Buttons */}
                        {step === 5 ? (
                            // Last screen: single "Got it" button
                            <Button
                                onClick={onClose}
                                style={{
                                    width: '302.22px',
                                    height: '33.74px',
                                    padding: '7.5px 15px',
                                    backgroundColor: '#000000',
                                    borderRadius: '0',
                                    fontFamily: 'Courier New',
                                    fontWeight: 400,
                                    fontSize: '13.13px',
                                    lineHeight: '18.75px',
                                    letterSpacing: '0px',
                                    color: '#FFFFFF',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '7.5px',
                                    border: 'none',
                                }}
                            >
                                Got it
                            </Button>
                        ) : (
                            // Other screens: Skip and Next buttons
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '15px',
                                }}
                            >
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    style={{
                                        flex: 1,
                                        height: '40px',
                                        border: '0.54px solid rgba(0, 0, 0, 0.2)',
                                        borderRadius: '0',
                                        fontFamily: 'Courier New',
                                        fontWeight: 400,
                                        fontSize: '15px',
                                        color: '#000000',
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleNext}
                                    style={{
                                        flex: 1,
                                        height: '40px',
                                        backgroundColor: '#000000',
                                        borderRadius: '0',
                                        fontFamily: 'Courier New',
                                        fontWeight: 400,
                                        fontSize: '15px',
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {step === totalSteps - 1 ? 'Finish' : 'Next'}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
