import React, { useState, useEffect, useRef, useCallback } from 'react';

const Timer = ({ onTimeUpdate }) => {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                setSeconds((prev) => {
                    const next = prev + 1;
                    onTimeUpdate(next);
                    return next;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isActive, onTimeUpdate]);

    const toggle = useCallback(() => {
        setIsActive((prev) => !prev);
    }, []);

    const reset = useCallback(() => {
        setIsActive(false);
        setSeconds(0);
        onTimeUpdate(0);
    }, [onTimeUpdate]);

    const formatDisplay = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="timer-container">
            <h2>⏱ Temporizador</h2>
            <p className="timer-display">{formatDisplay(seconds)}</p>
            <div className="timer-controls">
                <button className={`button ${isActive ? 'button-warning' : 'button-primary'}`} onClick={toggle}>
                    {isActive ? '⏸ Pausar' : '▶ Iniciar'}
                </button>
                <button className="button button-secondary" onClick={reset}>
                    🔄 Reiniciar
                </button>
            </div>
        </div>
    );
};

export default Timer;