import { useEffect, useState } from 'react';
import { StoreSnapshot, IdentityKey, CardMetadata } from '@mtga-overlay/shared';
import { PopupPanel } from './components/PopupPanel';

function App() {
    const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isClickThrough, setIsClickThrough] = useState(false);
    const [selectedCard, setSelectedCard] = useState<{ key: IdentityKey; metadata: CardMetadata } | null>(null);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onSnapshot((data: StoreSnapshot) => {
                setSnapshot(data);
            });
            window.electronAPI.onVisibility((visible: boolean) => {
                setIsVisible(visible);
            });
            window.electronAPI.onClickThrough((enabled: boolean) => {
                setIsClickThrough(enabled);
            });
        }
    }, []);

    if (!isVisible) return null;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            padding: '10px',
            backgroundColor: 'transparent',
            display: 'relative'
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
                <div>Log: {snapshot?.updateId ? 'CONNECTED' : 'WAITING'}</div>
                <div>State: [H:{snapshot?.zones.hand.length || 0} B:{snapshot?.zones.battlefield.length || 0} C:{Object.keys(snapshot?.cards || {}).length || 0}]</div>
                <div>Update ID: {snapshot?.updateId || 0}</div>
            </div>

            {snapshot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <ZoneView
                        name="Battlefield"
                        keys={snapshot.zones.battlefield}
                        cards={snapshot.cards}
                        onClick={(key, meta) => !isClickThrough && setSelectedCard({ key, metadata: meta })}
                    />
                    <ZoneView
                        name="Hand"
                        keys={snapshot.zones.hand}
                        cards={snapshot.cards}
                        onClick={(key, meta) => !isClickThrough && setSelectedCard({ key, metadata: meta })}
                    />
                </div>
            ) : (
                <div style={{ color: 'white', opacity: 0.5, fontFamily: 'sans-serif' }}>Waiting for MTGA game data...</div>
            )}

            {selectedCard && (
                <PopupPanel
                    cardKey={selectedCard.key}
                    metadata={selectedCard.metadata}
                    onClose={() => setSelectedCard(null)}
                    onCycleArt={(key) => window.electronAPI.cycleArt(key)}
                />
            )}
        </div>
    );
}

function ZoneView({ name, keys, cards, onClick }: {
    name: string;
    keys: IdentityKey[];
    cards: Record<IdentityKey, CardMetadata>;
    onClick: (key: IdentityKey, meta: CardMetadata) => void;
}) {
    return (
        <div style={{ fontFamily: 'sans-serif' }}>
            <h3 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase' }}>{name}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keys.map((key) => {
                    const card = cards[key];
                    return (
                        <div
                            key={key}
                            onClick={() => onClick(key, card)}
                            style={{
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                                width: '80px'
                            }}
                        >
                            {card?.imageUri ? (
                                <img
                                    src={card.imageUri}
                                    alt={card.name}
                                    style={{
                                        width: '100%',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '0.71',
                                    backgroundColor: '#333',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    color: '#888',
                                    textAlign: 'center'
                                }}>
                                    {card?.name || 'Loading...'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default App;
