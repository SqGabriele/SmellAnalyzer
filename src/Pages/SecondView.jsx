import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import React from "react";
import "../style.css";

export function SecondView() {
  const location = useLocation();
  const data = location.state?.data || {};

  const priorityLevels = ["High", "Medium to High", "Medium", "Low to Medium", "Low", "None to Low", "None"];
  const effortLevels = ["High effort", "Medium effort", "Low effort"];

  //smells recuperati dai dati
  const [rect, setRect] = useState(data.rectangles || []);

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
      console.log(updatedSmell);
  
      return newRect;
    });
  };

  return (
    <div className="container">
      <Link to="/" state={{ data: data }}>
        First View
      </Link>
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
                    r.smells.filter((s) => (s.effort == effort && s.impact == priority))
                    .map((smell, smellIndex) => (
                      <div key={`${rectIndex}-${smellIndex}`} className="smell-box">
                        <button onClick={() => updateEffort(rectIndex, smellIndex, -1)}>&lt;</button>
                        {" "+smell.smell.refactoring+" "}
                        <button onClick={() => updateEffort(rectIndex, smellIndex, 1)}>&gt;</button>
                        <br />
                        {"Service: " + smell.smell.name}
                      </div>
                    ))
                  )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}