import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import React from "react";
import Select from "react-select";
import "../style.css";

export function SecondView() {
  const location = useLocation();
  const data = location.state?.data || {};
  let activeTeams = location.state?.team || null;
  if(activeTeams != null)
    activeTeams = [{ value: activeTeams, label: activeTeams }]
  else
    activeTeams = Object.keys(data.teamColors).map((team) => ({ value: team, label: team }));

  const priorityLevels = ["High", "Medium to High", "Medium", "Low to Medium", "Low", "None to Low", "None"];
  const effortLevels = ["High effort", "Medium effort", "Low effort"];

  //smells recuperati dai dati
  const [rect, setRect] = useState(data.rectangles || []);
  const [selectedTeams, setSelectedTeams] = useState(activeTeams);
  const [hoveredSmell, setHoveredSmell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });


  //aumenta o diminuisce l'effort
  const updateEffort = (rectIndex, smellIndex, increment) => {
    setRect((prevRect) => {
      const newRect = [...prevRect];
      const updatedSmell = newRect[rectIndex].smells[smellIndex];
  
      //calcolo il nuovo valore dell'effort
      let val = effortLevels.indexOf(updatedSmell.effort);
      val = val + increment;
      if (val < 0) val = 2;
      else if (val > 2) val = 0;
  
      //aggiorna l'effort
      updatedSmell.effort = effortLevels[val];
  
      return newRect;
    });
  };

  //calcola i team che coinvolge uno smell
  const affectedTeam = (hoveredSmell) => {
    return new Set([hoveredSmell.team, 
      ...data.arcs
      .filter(arc => arc[0]?.name === hoveredSmell.name && arc[1]?.team) 
      .map(arc => arc[1].team)])
  }

  return (
    <div className="container">
      {/*scelta dei team*/}
      <Select
        isMulti
        options={Object.keys(data.teamColors).map((team) => ({ value: team, label: team }))}
        value={selectedTeams}
        onChange={(selectedOptions) => {
          setSelectedTeams(selectedOptions);
        }}
      />

      {/*griglia */}
      <div className="grid-container">
        {/*intestazione delle righe */}
        <div className="header-cell">Effort \ Priority</div>
        {effortLevels.map((priority) => (
          <div key={priority} className="header-cell">{priority}</div>
        ))}
        {priorityLevels.map((priority) => (
          <React.Fragment key={priority}>
            <div className="row-header">{priority}</div>
            {effortLevels.map((effort) => (
              <div key={`${effort}-${priority}`} className="grid-cell">
                { //inserisci gli smell giusti
                  rect.map((r, rectIndex) =>
                    r.smells.map((smell, smellIndex) => (
                      smell.effort === effort && smell.impact === priority && selectedTeams.some(t => affectedTeam(r).has(t.value)) ? (
                        <div key={`${rectIndex}-${smellIndex}`} className="smell-box" style={{ backgroundColor: r.color }}
                          onMouseEnter={(e) => {  //per la gestione dell'overlay
                            setHoveredSmell(r);
                            setTooltipPosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredSmell(null)}>

                          <button onClick={() => updateEffort(rectIndex, smellIndex, -1)}>&lt;</button>
                          {" " + smell.smell.refactoring + " "}
                          <button onClick={() => updateEffort(rectIndex, smellIndex, 1)}>&gt;</button>
                          <br />
                          {"Service: " + smell.smell.name}
                        </div>
                      ) : null
                    ))
                  )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/*overlay per i team*/}
      {hoveredSmell && (
        <div
          className="tooltip"
          style={{
            position: "fixed",
            top: tooltipPosition.y+10,
            left: tooltipPosition.x+10,
            backgroundColor: "black",
            color: "white",
          }}
        > 
          { "Team affected: " + 
            [...affectedTeam(hoveredSmell)].join(", ")
          }
        </div>
      )}
      <Link to="/" state={{ data: data }}>
        <button className="arrowButton">
            &lt;
        </button>
      </Link>
    </div>
  );
}