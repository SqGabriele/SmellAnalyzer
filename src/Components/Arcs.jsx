import React from "react";

function Lines({ nodes }) { //nodes è un array di coppie
  //funzione per rendere tutte le linee
  const renderLines = () => {
    let lines = [];
    
    //ciclo su ogni coppia di servizi per disegnare le linee
    for (let i = 0; i < nodes.length; i++) {
        const service1 = nodes[i][0];
        const service2 = nodes[i][1];
        
        //calcola i "punti di aggancio" dei due servizi
        let startX = service1.x + service1.size.width/2;
        let startY = service1.y + service1.size.height/2;
        let endX = service2.x + service2.size.width/2;
        let endY = service2.y + service2.size.height/2;
        const deltaX = service1.x - service2.x;
        const deltaY = service1.y - service2.y;
        if(Math.abs(deltaX) > Math.abs(deltaY)){
          if(deltaX <= 0){
            startX += service1.size.width/2;
            endX -= service2.size.width/2;
          }    
          else{
            startX -= service1.size.width/2;
            endX += service2.size.width/2;
          }      
        }
        else{
          if(deltaY <= 0){
            startY += service1.size.height/2;
            endY -= service2.size.height/2;
          }
          else{
            startY -= service1.size.height/2;
            endY += service2.size.height/2;
          }
        }

        //aggiungi una linea tra i due servizi
        lines.push(
            <line
            key={`${service1.key}-${service2.key}`}
            x1={startX}  //coordinate di partenza (centrate su service1)
            y1={startY}
            x2={endX}    //coordinate di arrivo (centrate su service2)
            y2={endY}
            stroke="black"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            />
        );
    }

    return lines;
  };

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="black" />
        </marker>
      </defs>
      {renderLines()}
    </svg>
  );
}

export default Lines;