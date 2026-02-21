import { useEffect, useState } from 'react';
import { StoreSnapshot, IdentityKey, CardMetadata } from '@mtga-overlay/shared';
import { PopupPanel } from './components/PopupPanel';
import { CardTile } from './components/CardTile';

function App() {
    const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isClickThrough, setIsClickThrough] = useState(false);
    const [selectedKey, setSelectedKey] = useState<IdentityKey | null>(null);

    useEffect(() => {
        if (window.electronAPI) {
            const unsubs = [
                window.electronAPI.onSnapshot((data: StoreSnapshot) => setSnapshot(data)),
                window.electronAPI.onVisibility((visible: boolean) => setIsVisible(visible)),
                window.electronAPI.onClickThrough((enabled: boolean) => setIsClickThrough(enabled))
            ];
            return () => unsubs.forEach(unsub => unsub());
        }
    }, []);

    if (!isVisible) return null;

    // Derived State: Always get the freshest metadata from the snapshot
    const selectedCardMetadata = (selectedKey && snapshot?.cards[selectedKey]) ? snapshot.cards[selectedKey] : null;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            padding: '10px',
            backgroundColor: 'transparent',
            position: 'relative' // Corrected from display: 'relative'
        }}>
            {/* Status Indicators */}
            <div style={{
                position: 'fixed',
                top: 5,
                right: 5,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'right',
                pointerEvents: 'none',
                fontFamily: 'sans-serif'
            }}>
                <div>Click-thru: {isClickThrough ? 'ON (Locked)' : 'OFF (Popup Mode)'}</div>
                <div>Visibility: {isVisible ? 'Visible' : 'Hidden'}</div>
                <div style={{ fontSize: '9px' }}>Ctrl+Shift+O (Visible) / Ctrl+Shift+C (Click)</div>
            </div>

            {/* Diagnostics Block */}
            <div style={{
                position: 'fixed',
                bottom: 5,
                left: 5,
                fontSize: '9px',
                color: 'rgba(255,255,255,0.3)',
                pointerEvents: 'none',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '2px 5px',
                borderRadius: '2px'
            }}>
                {/* Corrected: use snapshot existence instead of updateId truthiness (0 is truthy-ish but better to be explicit) */}
                <div>Log: {snapshot ? 'CONNECTED' : 'WAITING'}</div>
                <div>State: [H:{snapshot?.zones.hand.length || 0} B:{snapshot?.zones.battlefield.length || 0} C:{Object.keys(snapshot?.cards || {}).length || 0}]</div>
                <div>Update ID: {snapshot?.updateId || 0}</div>
            </div>

            {snapshot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <ZoneView
                        name="Battlefield"
                        keys={snapshot.zones.battlefield}
                        cards={snapshot.cards}
                        isClickThrough={isClickThrough}
                        onClick={(key) => !isClickThrough && setSelectedKey(key)}
                    />
                    <ZoneView
                        name="Hand"
                        keys={snapshot.zones.hand}
                        cards={snapshot.cards}
                        isClickThrough={isClickThrough}
                        onClick={(key) => !isClickThrough && setSelectedKey(key)}
                    />
                </div>
            ) : (
                <div style={{ color: 'white', opacity: 0.5, fontFamily: 'sans-serif' }}>Waiting for MTGA game data...</div>
            )}

            {selectedKey && selectedCardMetadata && (
                <PopupPanel
                    cardKey={selectedKey}
                    metadata={selectedCardMetadata}
                    onClose={() => setSelectedKey(null)}
                    onCycleArt={(key, direction) => window.electronAPI.cycleArt(key, direction)}
                    onResetArt={(key) => window.electronAPI.resetArt(key)}
                />
            )}
        </div>
    );
}

function ZoneView({ name, keys, cards, isClickThrough, onClick }: {
    name: string;
    keys: IdentityKey[];
    cards: Record<IdentityKey, CardMetadata>;
    isClickThrough: boolean;
    onClick: (key: IdentityKey) => void;
}) {
    return (
        <div style={{ fontFamily: 'sans-serif' }}>
            <h3 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase' }}>{name}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keys.map((key) => {
                    const card = cards[key];
                    // Guard against undefined card metadata
                    if (!card) return null;
                    return (
                        <CardTile
                            key={key}
                            cardKey={key}
                            card={card}
                            isClickThrough={isClickThrough}
                            onClick={() => onClick(key)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default App;
