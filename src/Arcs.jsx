import React from "react";

function Lines({ nodes }) { //nodes è un array di coppie
  // Funzione per rendere tutte le linee
  const renderLines = () => {
    let lines = [];
    
    // Ciclo su ogni coppia di servizi per disegnare le linee
    for (let i = 0; i < nodes.length; i++) {
        const service1 = nodes[i][0];
        const service2 = nodes[i][1];
        
        // Calcola il centro dei due servizi (per disegnare la linea al centro di ciascuno)
        const startX = service1.x + 75;
        const startY = service1.y + 75;
        const endX = service2.x + 75;
        const endY = service2.y + 75;

        // Aggiungi una linea tra i due servizi
        lines.push(
            <line
            key={`${service1.key}-${service2.key}`}
            x1={startX}  // Coordinate di partenza (centrate su service1)
            y1={startY}
            x2={endX}    // Coordinate di arrivo (centrate su service2)
            y2={endY}
            stroke="black"
            strokeWidth="2"
            />
        );
    }

    return lines;
  };

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1}}>
      {renderLines()}
    </svg>
  );
}

export default Lines;