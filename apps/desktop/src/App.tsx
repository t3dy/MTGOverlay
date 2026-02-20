import { useState, useEffect } from 'react';

// Define the shape coming from IPC, matching StoreSnapshot
interface StoreSnapshot {
    zones: {
        hand: string[];
        battlefield: string[];
    };
    cards: Record<string, { name: string; imageUri?: string }>;
    updateId: number;
}

function App() {
    const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);

    useEffect(() => {
        // Listen for updates from main process
        if (window.electronAPI) {
            window.electronAPI.onUpdate((_event: any, data: any) => {
                // Ensure data matches expected shape or cast it
                setSnapshot(data as StoreSnapshot);
            });
        }
    }, []);

    const renderZone = (title: string, keys: string[]) => (
        <div className="zone-container">
            <h3>{title}</h3>
            <div className="zone-grid">
                {keys.map((key) => {
                    const card = snapshot?.cards[key];
                    return (
                        <div key={key} className="card-item">
                            {card?.imageUri ? (
                                <img src={card.imageUri} alt={card.name} width="80" />
                            ) : (
                                <div className="card-placeholder">{card?.name || 'Unknown'}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (!snapshot) return <div className="app-container"><h1>MTGA Overlay</h1><p>Waiting for game data...</p></div>;

    return (
        <div className="app-container">
            <h1>MTGA Overlay</h1>
            {renderZone('Hand', snapshot.zones.hand)}
            {renderZone('Battlefield', snapshot.zones.battlefield)}
        </div>
    );
}

export default App;
