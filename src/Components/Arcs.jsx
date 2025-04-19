import React, { useState } from "react";

function Lines({ nodes, newArc, prospective, onDeleteArc, isChecked }) { //nodes è un array di coppie
  const [hoveredKey, setHoveredKey] = useState(null);

  //data una diversa prospettiva ti dice se renderizzare un arco
  const renderThisArc = (arc) => {
    if(prospective.some(x => arc[0].team === x.value)){
      if(isChecked)
        return true;
      if(prospective.some(x => arc[1].team === x.value))
        return true;
    }
    if(isChecked && prospective.some(x => arc[1].team === x.value))
      return true;
    return false;
  }

  //funzione per rendere tutte le linee
  const renderLines = () => {
    let lines = [];

    //prima linea
    if(newArc!= null){
      lines.push(
        <line
        key={`newArc`}
        x1={newArc.arcPosition[0].x}  //coordinate di partenza (centrate su service1)
        y1={newArc.arcPosition[0].y}
        x2={newArc.arcPosition[1].x}    //coordinate di arrivo (centrate su service2)
        y2={newArc.arcPosition[1].y}
        stroke="black"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
        />
      );
    }   
    
    //ciclo su ogni coppia di servizi per disegnare le linee
    for (let i = 0; i < nodes.length; i++) {
        //renderizzo questo arco?
        if(!(renderThisArc(nodes[i])))
          continue;

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

        const key = `${service1.key}-${service2.key}`;
        const isHovered = hoveredKey === key;

        //aggiungi una linea tra i due servizi
        lines.push(
          <g key={`arc-${key}`}>
          {/*linea vera e propria*/}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={isHovered ? "red" : "black"}
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
            pointerEvents="none"
          />
        
          {/*hitbox*/}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="transparent"
            strokeWidth={12}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
            onClick={() => onDeleteArc(service1, service2)}
            style={{ pointerEvents: "auto", cursor: "pointer" }}
          />
        </g>
        );
    }

    return lines;
  };

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
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