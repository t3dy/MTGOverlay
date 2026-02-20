import { useState, useEffect } from 'react';

function App() {
    const [cards, setCards] = useState<any[]>([]);

    useEffect(() => {
        // Listen for updates from main process
        if (window.electronAPI) {
            window.electronAPI.onUpdate((event, data) => {
                console.log('Update received:', data);
                setCards(data.zones.hand); // Just showing hand for now
            });
        }
    }, []);

    return (
        <div className="app-container">
            <h1>MTGA Overlay</h1>
            <div className="card-list">
                {cards.map((card: any) => (
                    <div key={card.id} className="card-item">
                        <img src={card.imageUri} alt={card.name} width="100" />
                        <p>{card.name}</p>
                    </div>
                ))}
                {cards.length === 0 && <p>Waiting for match data...</p>}
            </div>
        </div>
    );
}

export default App;
