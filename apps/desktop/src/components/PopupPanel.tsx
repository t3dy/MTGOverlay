import React from 'react';
import { CardMetadata } from '@mtga-overlay/shared';

interface PopupPanelProps {
    cardKey: string;
    metadata: CardMetadata;
    onClose: () => void;
    onCycleArt: (key: string, direction?: 'next' | 'prev') => void;
    onResetArt: (key: string) => void;
}

export const PopupPanel: React.FC<PopupPanelProps> = ({ cardKey, metadata, onClose, onCycleArt, onResetArt }) => {
    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #444',
            borderRadius: '8px',
            padding: '20px',
            color: 'white',
            zIndex: 1000,
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            minWidth: '300px'
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '20px'
                }}
            >
                &times;
            </button>
            <h2 style={{ margin: '0 0 15px 0' }}>{metadata.name}</h2>
            {metadata.imageUri && (
                <img
                    src={metadata.imageUri}
                    alt={metadata.name}
                    style={{ maxWidth: '250px', borderRadius: '4px', marginBottom: '15px' }}
                />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                    onClick={() => onCycleArt(cardKey)}
                    style={{
                        padding: '10px',
                        backgroundColor: '#0078d4',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Cycle Art (Prints)
                </button>
                <button
                    onClick={() => onResetArt(cardKey)}
                    style={{
                        padding: '8px',
                        backgroundColor: 'transparent',
                        border: '1px solid #666',
                        borderRadius: '4px',
                        color: '#aaa',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Reset Art
                </button>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    Oracle ID: {metadata.oracleId || 'Unknown'}
                </div>

                {metadata.draftStats && (
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        textAlign: 'left',
                        fontSize: '13px'
                    }}>
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #444', marginBottom: '8px', paddingBottom: '4px', color: '#0078d4' }}>
                            17Lands Draft Stats
                        </div>
                        {metadata.draftStats.ambiguous ? (
                            <div style={{ color: '#ffcc00', fontStyle: 'italic' }}>
                                Ambiguous match in 17Lands data (duplicate name).
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div><span style={{ color: '#888' }}>ALSA:</span> {metadata.draftStats.metrics.alsa.toFixed(2)}</div>
                                <div><span style={{ color: '#888' }}>GIH WR:</span> <span style={{ color: '#4caf50' }}>{(metadata.draftStats.metrics.gihWr * 100).toFixed(1)}%</span></div>
                                <div><span style={{ color: '#888' }}>GP WR:</span> {(metadata.draftStats.metrics.gpWr * 100).toFixed(1)}%</div>
                                <div><span style={{ color: '#888' }}>ATA:</span> {metadata.draftStats.metrics.ata.toFixed(2)}</div>
                                <div><span style={{ color: '#888' }}>Seen:</span> {metadata.draftStats.metrics.seen}</div>
                                <div><span style={{ color: '#888' }}>Picked:</span> {metadata.draftStats.metrics.picked}</div>
                                <div><span style={{ color: '#888' }}>IIH:</span> {metadata.draftStats.metrics.iihPp.toFixed(1)}pp</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
